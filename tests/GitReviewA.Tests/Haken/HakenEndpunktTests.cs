using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Protokoll;
using GitReviewA.Server;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Haken;

/// <summary>`GET` und `POST /api/haken` auf freiem Port (Kriterien 8 und 9, Statuscodes); 409 und 500 am Adapter selbst.</summary>
public class HakenEndpunktTests
{
    private const string HashA = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";
    private const string Gueltig = "{\"commit\":\"" + HashA + "\",\"datei\":\"alt.txt\",\"abgehakt\":true}";

    [Test]
    public async Task Wenn_eine_Stelle_der_Auswahl_abgehakt_dann_200_mit_1_von_2_und_der_Stand_nennt_sie()
    {
        await using var server = await StarteServer(TestUebersichtsquelle.Mit(HashA, "alt.txt", "src/b.txt"));
        using var client = new HttpClient();

        var antwort = await Sende(client, server, Gueltig);
        var stand = await Hole(client, server, host: null);

        Assert.That(antwort.Status, Is.EqualTo(HttpStatusCode.OK));
        Assert.That((antwort.Json.GetProperty("abgehakt").GetInt32(), antwort.Json.GetProperty("gesamt").GetInt32()), Is.EqualTo((1, 2)));
        Assert.That(stand.Status, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(stand.Text, Is.EqualTo("{\"stellen\":[{\"commit\":\"" + HashA + "\",\"datei\":\"alt.txt\",\"abgehakt\":true},{\"commit\":\"" + HashA + "\",\"datei\":\"src/b.txt\",\"abgehakt\":false}],\"abgehakt\":1,\"gesamt\":2}"));
        Assert.That(stand.Koepfe, Has.None.StartsWith("Access-Control-"));
    }

    [TestCase("kein json")]
    [TestCase("")]
    [TestCase("null")]
    [TestCase("[]")]
    [TestCase("{\"commit\":\"" + HashA + "\",\"datei\":\"alt.txt\",\"abgehakt\":\"true\"}")]
    [TestCase("{\"commit\":\"" + HashA + "\",\"datei\":\"alt.txt\",\"abgehakt\":1}")]
    [TestCase("{\"commit\":\"" + HashA + "\",\"datei\":\"alt.txt\",\"abgehakt\":true,\"abgehakt\":false}")]
    [TestCase("{\"commit\":\"" + HashA + "\",\"datei\":\"alt.txt\"}")]
    [TestCase("{\"commit\":\"a1b2c3d\",\"datei\":\"alt.txt\",\"abgehakt\":true}")]
    [TestCase("{\"commit\":\"" + HashA + "\",\"datei\":\"src/c.txt\",\"abgehakt\":true}")]
    [TestCase("{\"commit\":\"" + HashA + "\",\"datei\":\"alt.txt\\nsrc/b.txt\",\"abgehakt\":true}")]
    public async Task Wenn_Koerper_oder_Stelle_ungueltig_dann_400_mit_Meldung_und_kein_Haken(string koerper)
    {
        await using var server = await StarteServer(TestUebersichtsquelle.Mit(HashA, "alt.txt", "src/b.txt"));
        using var client = new HttpClient();

        var antwort = await Sende(client, server, koerper);

        Assert.That(antwort.Status, Is.EqualTo(HttpStatusCode.BadRequest));
        Assert.That(antwort.Json.GetProperty("meldung").GetString(), Is.Not.Empty);
        Assert.That(server.DateiAbhaken.Stand().Dateien.Abgehakt, Is.Zero);
    }

    [TestCase("http://localhost:{port}", "application/json", HttpStatusCode.Forbidden)]
    [TestCase("http://evil.example", "application/json", HttpStatusCode.Forbidden)]
    [TestCase(null, "text/plain", HttpStatusCode.UnsupportedMediaType)]
    [TestCase(null, "application/x-www-form-urlencoded", HttpStatusCode.UnsupportedMediaType)]
    public async Task Wenn_Haken_mit_fremdem_Origin_oder_ohne_JSON_dann_abgewiesen_und_kein_Haken(string? origin, string inhaltstyp, HttpStatusCode erwartet)
    {
        await using var server = await StarteServer(TestUebersichtsquelle.Mit(HashA, "alt.txt"));
        using var client = new HttpClient();
        var port = new Uri(server.Adresse).Port.ToString(System.Globalization.CultureInfo.InvariantCulture);

        var antwort = await Sende(client, server, Gueltig, origin: origin?.Replace("{port}", port), inhaltstyp: inhaltstyp);

        Assert.That(antwort.Status, Is.EqualTo(erwartet));
        Assert.That(server.DateiAbhaken.Stand().Dateien.Abgehakt, Is.Zero);
    }

    [Test]
    public async Task Wenn_Haken_mit_Host_localhost_dann_403_und_kein_Haken()
    {
        await using var server = await StarteServer(TestUebersichtsquelle.Mit(HashA, "alt.txt"));
        using var client = new HttpClient();

        var antwort = await Sende(client, server, Gueltig, host: $"localhost:{new Uri(server.Adresse).Port}");

        Assert.That(antwort.Status, Is.EqualTo(HttpStatusCode.Forbidden));
        Assert.That(server.DateiAbhaken.Stand().Dateien.Abgehakt, Is.Zero);
    }

    [TestCase("DELETE")]
    [TestCase("PUT")]
    public async Task Wenn_weder_POST_noch_GET_dann_405(string methode)
    {
        await using var server = await StarteServer(TestUebersichtsquelle.Mit(HashA, "alt.txt"));
        using var client = new HttpClient();
        using var anfrage = new HttpRequestMessage(new HttpMethod(methode), new Uri(new Uri(server.Adresse), "api/haken"));
        anfrage.Content = new StringContent(Gueltig, Encoding.UTF8, "application/json");

        using var antwort = await client.SendAsync(anfrage);

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.MethodNotAllowed));
        Assert.That(server.DateiAbhaken.Stand().Dateien.Abgehakt, Is.Zero);
    }

    [Test]
    public async Task Wenn_ein_Haken_per_GET_mit_Angaben_in_der_Adresse_gesetzt_werden_soll_dann_liefert_GET_nur_den_Stand_und_setzt_nichts()
    {
        await using var server = await StarteServer(TestUebersichtsquelle.Mit(HashA, "alt.txt"));
        using var client = new HttpClient();

        using var antwort = await client.GetAsync(new Uri(new Uri(server.Adresse), $"api/haken?commit={HashA}&datei=alt.txt&abgehakt=true"));
        var text = await antwort.Content.ReadAsStringAsync();

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(text, Does.EndWith("\"abgehakt\":0,\"gesamt\":1}"));
        Assert.That(server.DateiAbhaken.Stand().Dateien.Abgehakt, Is.Zero);
    }

    [TestCase("localhost")]
    [TestCase("evil.example")]
    public async Task Wenn_der_Stand_mit_fremdem_Host_gelesen_wird_dann_403_ohne_Stellen_im_Koerper(string host)
    {
        await using var server = await StarteServer(TestUebersichtsquelle.Mit(HashA, "alt.txt"));
        using var client = new HttpClient();

        var antwort = await Hole(client, server, host: $"{host}:{new Uri(server.Adresse).Port}");

        Assert.That(antwort.Status, Is.EqualTo(HttpStatusCode.Forbidden));
        Assert.That(antwort.Text, Does.Not.Contain("alt.txt"));
        Assert.That(antwort.Koepfe, Has.None.StartsWith("Access-Control-"));
    }

    [Test]
    public async Task Wenn_die_Uebersicht_nicht_lesbar_ist_dann_antworten_Stand_und_Haken_mit_500_und_der_Lauf_geht_weiter()
    {
        await using var server = await StarteServer(TestUebersichtsquelle.Scheiternd());
        using var client = new HttpClient();

        var stand = await Hole(client, server, host: null);
        var haken = await Sende(client, server, Gueltig);
        using var zustand = await client.GetAsync(new Uri(new Uri(server.Adresse), "api/zustand"));

        Assert.That(stand.Status, Is.EqualTo(HttpStatusCode.InternalServerError));
        Assert.That(JsonDocument.Parse(stand.Text).RootElement.GetProperty("meldung").GetString(), Is.EqualTo("Fortschritt konnte nicht gelesen werden"));
        Assert.That(haken.Status, Is.EqualTo(HttpStatusCode.InternalServerError));
        Assert.That(zustand.StatusCode, Is.EqualTo(HttpStatusCode.OK));
    }

    [TestCase("Gesetzt", 200)]
    [TestCase("Ungueltig", 400)]
    [TestCase("Beendet", 409)]
    [TestCase("NichtLesbar", 500)]
    public void Wenn_der_Interactor_antwortet_dann_bildet_der_Adapter_den_Ausgang_auf_den_Statuscode_ab(string ausgang, int erwartet)
    {
        var antwort = HakenEndpunkt.AlsAntwort(new Hakenergebnis(Enum.Parse<Hakenausgang>(ausgang), 1, 2, "Grund"));

        Assert.That(antwort.Statuscode, Is.EqualTo(erwartet));
    }

    [Test]
    public void Wenn_der_Review_beendet_ist_dann_lehnt_der_Interactor_mit_beendet_ab_und_der_Adapter_mit_409()
    {
        var speicher = new Hakenspeicher();
        speicher.VersucheZuSiegeln();
        var protokoll = new StderrProtokoll(new StringWriter(), TimeProvider.System, Protokollstufe.Warnung);
        var interactor = new DateiAbhakenInteractor(TestUebersichtsquelle.Mit(HashA, "alt.txt"), speicher, protokoll);

        var antwort = HakenEndpunkt.AlsAntwort(interactor.Setze(new Hakenanfrage(HashA, "alt.txt", true)));

        Assert.That(antwort, Is.EqualTo(new EndpunktAntwort(409, new GitReviewA.Server.MeldungAntwort("Review ist beendet — kein Haken mehr möglich"))));
        Assert.That(speicher.Schnappschuss().Anzahl, Is.Zero);
    }

    private static async Task<Webserver> StarteServer(TestUebersichtsquelle quelle)
    {
        var commits = new Commitzeilen([new Commitzeile(HashA, "Testperson", "2026-01-01T09:00:00+00:00", "Erster Commit", "")]);
        var protokoll = new StderrProtokoll(new StringWriter(), TimeProvider.System, Protokollstufe.Warnung);
        return await Webserver.StartenAsync(0, commits, TestDateiquelle.Leer(), TestDiffquelle.Leer(), quelle, Oberflaeche.AusDemProgramm(), protokoll);
    }

    private static async Task<(HttpStatusCode Status, JsonElement Json)> Sende(HttpClient client, Webserver server, string koerper, string? origin = null, string? host = null, string inhaltstyp = "application/json")
    {
        using var anfrage = new HttpRequestMessage(HttpMethod.Post, new Uri(new Uri(server.Adresse), "api/haken"));
        anfrage.Content = new StringContent(koerper, Encoding.UTF8);
        anfrage.Content.Headers.ContentType = new MediaTypeHeaderValue(inhaltstyp);
        if (origin is not null)
        {
            anfrage.Headers.Add("Origin", origin);
        }
        if (host is not null)
        {
            anfrage.Headers.Host = host;
        }
        using var antwort = await client.SendAsync(anfrage);
        var text = await antwort.Content.ReadAsStringAsync();
        var json = default(JsonElement);
        if (text.Length > 0)
        {
            json = JsonDocument.Parse(text).RootElement.Clone();
        }
        return (antwort.StatusCode, json);
    }

    private static async Task<(HttpStatusCode Status, string Text, string[] Koepfe)> Hole(HttpClient client, Webserver server, string? host)
    {
        using var anfrage = new HttpRequestMessage(HttpMethod.Get, new Uri(new Uri(server.Adresse), "api/haken"));
        if (host is not null)
        {
            anfrage.Headers.Host = host;
        }
        using var antwort = await client.SendAsync(anfrage);
        var text = await antwort.Content.ReadAsStringAsync();
        var koepfe = antwort.Headers.Concat(antwort.Content.Headers).Select(kopf => kopf.Key).ToArray();
        return (antwort.StatusCode, text, koepfe);
    }
}
