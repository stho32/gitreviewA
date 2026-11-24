using System.Net;
using System.Net.Http.Headers;
using System.Text;
using GitReviewA.Git;
using GitReviewA.Protokoll;
using GitReviewA.Server;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Beenden;

public class BeendenEndpunktTests
{
    private const string HashA = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";
    private static readonly TimeSpan Frist = TimeSpan.FromSeconds(5);

    [Test]
    public async Task Wenn_Beenden_angefordert_dann_200_Speicher_abgeschlossen_und_Server_endet()
    {
        var protokollziel = new StringWriter();
        await using var server = await StarteServer(protokollziel);
        using var client = new HttpClient();

        var antwort = await Beende(client, server);

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(await antwort.Content.ReadAsStringAsync(), Is.EqualTo("{\"zustand\":\"beendet\"}"));
        Assert.That(server.Anmerkungen.IstAbgeschlossen, Is.True);
        await server.WartenBisBeendetAsync().WaitAsync(Frist);
        Assert.That(protokollziel.ToString(), Does.Contain("INFO [Beenden] Review beendet mit 0 Anmerkungen"));
    }

    [Test]
    public async Task Wenn_zweimal_gleichzeitig_beendet_dann_nur_eine_Wirkung_und_beide_200_oder_keine_Verbindung()
    {
        var protokollziel = new StringWriter();
        await using var server = await StarteServer(protokollziel);
        using var client = new HttpClient();

        var antworten = await Task.WhenAll(VersucheZuBeenden(client, server), VersucheZuBeenden(client, server));

        await server.WartenBisBeendetAsync().WaitAsync(Frist);
        Assert.That(antworten, Has.Some.EqualTo(HttpStatusCode.OK));
        Assert.That(antworten, Is.All.EqualTo(HttpStatusCode.OK).Or.EqualTo((HttpStatusCode)0));
        var beendetMeldungen = protokollziel.ToString().Split('\n').Count(zeile => zeile.Contains("Review beendet", StringComparison.Ordinal));
        Assert.That(beendetMeldungen, Is.EqualTo(1));
    }

    [TestCase("POST", "http://evil.example", "application/json", HttpStatusCode.Forbidden)]
    [TestCase("GET", null, null, HttpStatusCode.MethodNotAllowed)]
    [TestCase("POST", null, "text/plain", HttpStatusCode.UnsupportedMediaType)]
    [TestCase("POST", null, null, HttpStatusCode.UnsupportedMediaType)]
    public async Task Wenn_Beenden_abgewiesen_dann_Status_und_Lauf_geht_weiter(string methode, string? origin, string? inhaltstyp, HttpStatusCode erwartet)
    {
        await using var server = await StarteServer(new StringWriter());
        using var client = new HttpClient();
        using var anfrage = new HttpRequestMessage(new HttpMethod(methode), new Uri(new Uri(server.Adresse), "api/beenden"));
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
        Assert.That(server.Anmerkungen.IstAbgeschlossen, Is.False);
        Assert.That((await client.GetAsync(new Uri(new Uri(server.Adresse), "api/zustand"))).StatusCode, Is.EqualTo(HttpStatusCode.OK));
    }

    private static async Task<Webserver> StarteServer(StringWriter protokollziel)
    {
        var commits = new Commitzeilen([new Commitzeile(HashA, "Testperson", "2026-01-01T09:00:00+00:00", "Erster Commit", "")]);
        var protokoll = new StderrProtokoll(protokollziel, TimeProvider.System, Protokollstufe.Information);
        return await Webserver.StartenAsync(0, commits, TestDateiquelle.Leer(), TestDiffquelle.Leer(), Oberflaeche.AusDemProgramm(), protokoll);
    }

    private static async Task<HttpResponseMessage> Beende(HttpClient client, Webserver server)
    {
        using var inhalt = new StringContent("{}", Encoding.UTF8, "application/json");
        return await client.PostAsync(new Uri(new Uri(server.Adresse), "api/beenden"), inhalt);
    }

    private static async Task<HttpStatusCode> VersucheZuBeenden(HttpClient client, Webserver server)
    {
        try
        {
            using var antwort = await Beende(client, server);
            return antwort.StatusCode;
        }
        catch (HttpRequestException)
        {
            return 0;
        }
    }
}
