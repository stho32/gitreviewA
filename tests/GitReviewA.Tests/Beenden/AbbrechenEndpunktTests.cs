using System.Net;
using System.Net.Http.Headers;
using System.Net.Sockets;
using System.Text;
using GitReviewA.Beenden;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Protokoll;
using GitReviewA.Server;
using GitReviewA.Tests.Hilfen;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;

namespace GitReviewA.Tests.Beenden;

/// <summary>
/// B4603: `POST /api/abbrechen` (R00050) — Anfrageschutz wie `POST /api/beenden`, ein Einmal-Schalter gemeinsam mit dem
/// Beenden in beide Richtungen (409 nennt den geltenden Zustand), der Abbruch stoppt den Server geordnet, und ein Körper,
/// der nie ganz ankommt, ist kein Abbruch.
/// </summary>
public class AbbrechenEndpunktTests
{
    private const string HashA = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";
    private static readonly TimeSpan Frist = TimeSpan.FromSeconds(5);

    [Test]
    public async Task Wenn_Abbruch_angefordert_dann_200_abgebrochen_und_Server_endet()
    {
        var protokollziel = new StringWriter();
        await using var server = await StarteServer(protokollziel);
        using var client = new HttpClient();

        var antwort = await Abbrechen(client, server);

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(await antwort.Content.ReadAsStringAsync(), Is.EqualTo("{\"zustand\":\"abgebrochen\"}"));
        Assert.That(server.Laufende.Zustand, Is.EqualTo(Laufentscheidung.Abbruch));
        await server.WartenBisBeendetAsync().WaitAsync(Frist);
        Assert.That(protokollziel.ToString(), Does.Not.Contain("Review beendet"));
    }

    [TestCase("POST", "http://evil.example", "application/json", HttpStatusCode.Forbidden)]
    [TestCase("GET", null, null, HttpStatusCode.MethodNotAllowed)]
    [TestCase("POST", null, "text/plain", HttpStatusCode.UnsupportedMediaType)]
    [TestCase("POST", null, null, HttpStatusCode.UnsupportedMediaType)]
    public async Task Wenn_Abbruch_abgewiesen_dann_Status_und_Lauf_geht_weiter(string methode, string? origin, string? inhaltstyp, HttpStatusCode erwartet)
    {
        await using var server = await StarteServer(new StringWriter());
        using var client = new HttpClient();
        using var anfrage = new HttpRequestMessage(new HttpMethod(methode), new Uri(new Uri(server.Adresse), "api/abbrechen"));
        if (methode == "POST")
        {
            anfrage.Content = new ByteArrayContent(Encoding.UTF8.GetBytes("{}"));
        }
        if (inhaltstyp is not null)
        {
            anfrage.Content!.Headers.ContentType = new MediaTypeHeaderValue(inhaltstyp);
        }
        if (origin is not null)
        {
            anfrage.Headers.Add("Origin", origin);
        }

        using var antwort = await client.SendAsync(anfrage);

        Assert.That(antwort.StatusCode, Is.EqualTo(erwartet));
        Assert.That(server.Laufende.Zustand, Is.EqualTo(Laufentscheidung.Laeuft));
        Assert.That((await client.GetAsync(new Uri(new Uri(server.Adresse), "api/zustand"))).StatusCode, Is.EqualTo(HttpStatusCode.OK));
    }

    [Test]
    public async Task Wenn_der_Host_fremd_ist_dann_403_und_kein_Abbruch()
    {
        await using var server = await StarteServer(new StringWriter());
        using var client = new HttpClient();
        var anfrage = new HttpRequestMessage(HttpMethod.Post, new Uri(new Uri(server.Adresse), "api/abbrechen"))
        {
            Content = new StringContent("{}", Encoding.UTF8, "application/json"),
        };
        anfrage.Headers.Host = "evil.example";

        using var antwort = await client.SendAsync(anfrage);

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.Forbidden));
        Assert.That(server.Laufende.Zustand, Is.EqualTo(Laufentscheidung.Laeuft));
    }

    [Test]
    public async Task Wenn_der_Koerper_nie_ganz_ankommt_dann_ist_es_kein_Abbruch_und_die_Positivkontrolle_wirkt()
    {
        await using var server = await StarteServer(new StringWriter());
        await SendeHalbGesendetenKoerper(server);

        Assert.That(server.Laufende.Zustand, Is.EqualTo(Laufentscheidung.Laeuft));
        using var client = new HttpClient();
        Assert.That((await client.GetAsync(new Uri(new Uri(server.Adresse), "api/zustand"))).StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That((await Abbrechen(client, server)).StatusCode, Is.EqualTo(HttpStatusCode.OK));
        await server.WartenBisBeendetAsync().WaitAsync(Frist);
        Assert.That(server.Laufende.Zustand, Is.EqualTo(Laufentscheidung.Abbruch));
    }

    [Test]
    public async Task Wenn_der_Abbruch_angenommen_ist_dann_antwortet_Beenden_409_abgebrochen()
    {
        var laufende = new Laufende();
        Assert.That(laufende.Versuche(Laufentscheidung.Abbruch).Angenommen, Is.True);
        var lebensdauer = new Testlebensdauer();
        var endpunkt = BeendenEndpunkt.Fuer(new GitReviewA.Anmerkungen.Anmerkungsspeicher(), new Hakenspeicher(), laufende, lebensdauer, new StderrProtokoll(new StringWriter(), TimeProvider.System, Protokollstufe.Warnung));

        var (status, koerper) = await RufeEndpunktAuf(endpunkt);

        Assert.That(status, Is.EqualTo(StatusCodes.Status409Conflict));
        Assert.That(koerper, Is.EqualTo("{\"zustand\":\"abgebrochen\"}"));
        Assert.That(lebensdauer.AnzahlStopps, Is.EqualTo(0));
    }

    [Test]
    public async Task Wenn_Beenden_angenommen_ist_dann_antwortet_Abbruch_409_beendet()
    {
        var laufende = new Laufende();
        Assert.That(laufende.Versuche(Laufentscheidung.Beenden).Angenommen, Is.True);
        var lebensdauer = new Testlebensdauer();
        var endpunkt = AbbrechenEndpunkt.Fuer(laufende, lebensdauer);

        var (status, koerper) = await RufeEndpunktAuf(endpunkt);

        Assert.That(status, Is.EqualTo(StatusCodes.Status409Conflict));
        Assert.That(koerper, Is.EqualTo("{\"zustand\":\"beendet\"}"));
        Assert.That(lebensdauer.AnzahlStopps, Is.EqualTo(0));
    }

    [Test]
    public async Task Wenn_zweimal_abgebrochen_wird_dann_antwortet_beides_200_und_stoppt_genau_einmal()
    {
        var laufende = new Laufende();
        var lebensdauer = new Testlebensdauer();
        var endpunkt = AbbrechenEndpunkt.Fuer(laufende, lebensdauer);

        var erster = await RufeEndpunktAuf(endpunkt);
        var zweiter = await RufeEndpunktAuf(endpunkt);

        Assert.That((erster.Status, zweiter.Status), Is.EqualTo((StatusCodes.Status200OK, StatusCodes.Status200OK)));
        Assert.That((erster.Koerper, zweiter.Koerper), Is.EqualTo(("{\"zustand\":\"abgebrochen\"}", "{\"zustand\":\"abgebrochen\"}")));
        Assert.That(lebensdauer.AnzahlStopps, Is.EqualTo(1));
    }

    private static async Task<(int Status, string Koerper)> RufeEndpunktAuf(RequestDelegate endpunkt)
    {
        var kontext = new DefaultHttpContext();
        kontext.Request.Method = HttpMethods.Post;
        kontext.Request.ContentType = "application/json";
        kontext.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes("{}"));
        kontext.Response.Body = new MemoryStream();

        await endpunkt(kontext);

        kontext.Response.Body.Position = 0;
        using var leser = new StreamReader(kontext.Response.Body);
        return (kontext.Response.StatusCode, await leser.ReadToEndAsync());
    }

    private static async Task<Webserver> StarteServer(StringWriter protokollziel)
    {
        var commits = new Commitzeilen([new Commitzeile(HashA, "Testperson", "2026-01-01T09:00:00+00:00", "Erster Commit", "")]);
        var protokoll = new StderrProtokoll(protokollziel, TimeProvider.System, Protokollstufe.Information);
        return await Webserver.StartenAsync(0, commits, TestDateiquelle.Leer(), TestDiffquelle.Leer(), TestUebersichtsquelle.Mit(HashA, "a.txt"), TestZusammenquelle.Leer(), Oberflaeche.AusDemProgramm(), protokoll);
    }

    private static async Task<HttpResponseMessage> Abbrechen(HttpClient client, Webserver server)
    {
        using var inhalt = new StringContent("{}", Encoding.UTF8, "application/json");
        return await client.PostAsync(new Uri(new Uri(server.Adresse), "api/abbrechen"), inhalt);
    }

    private static async Task SendeHalbGesendetenKoerper(Webserver server)
    {
        var port = new Uri(server.Adresse).Port;
        using var verbindung = new TcpClient();
        await verbindung.ConnectAsync(IPAddress.Loopback, port);
        using var strom = verbindung.GetStream();
        var kopf = $"POST /api/abbrechen HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nOrigin: http://127.0.0.1:{port}\r\nContent-Type: application/json\r\nContent-Length: 1000\r\nConnection: close\r\n\r\n{{";
        await strom.WriteAsync(Encoding.ASCII.GetBytes(kopf));
        await strom.FlushAsync();
        // Der Körper bleibt aus; die Verbindung wird geschlossen — das ist kein Abbruch.
        await Task.Delay(200, TestContext.CurrentContext.CancellationToken);
        verbindung.Close();
    }

    private sealed class Testlebensdauer : IHostApplicationLifetime
    {
        private readonly CancellationTokenSource quelle = new();

        public CancellationToken ApplicationStarted => quelle.Token;

        public CancellationToken ApplicationStopping => quelle.Token;

        public CancellationToken ApplicationStopped => quelle.Token;

        public int AnzahlStopps { get; private set; }

        public void StopApplication()
        {
            AnzahlStopps += 1;
        }
    }
}