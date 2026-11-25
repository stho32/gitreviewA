using System.Net;
using System.Text.Json;
using GitReviewA.Aufruf;
using GitReviewA.Git;
using GitReviewA.Protokoll;
using GitReviewA.Server;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Server;

public class WebserverTests
{
    private const string HashC = "c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6";
    private const string HashA = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";

    [Test]
    public async Task Wenn_gestartet_dann_lauscht_er_auf_127_0_0_1_mit_freiem_Port_und_Zustand_antwortet_200()
    {
        await using var server = await StarteServer(new StringWriter(), Protokollstufe.Warnung);
        using var client = new HttpClient();

        var antwort = await client.GetAsync(new Uri(new Uri(server.Adresse), "api/zustand"));

        Assert.That(server.Adresse, Does.Match(@"^http://127\.0\.0\.1:\d+/$"));
        Assert.That(server.Adresse, Does.Not.EndWith(":0/"));
        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.OK));
    }

    [Test]
    public async Task Wenn_Commits_abgefragt_dann_JSON_in_Aufrufreihenfolge_mit_Hash_Kurzhash_und_Betreff()
    {
        await using var server = await StarteServer(new StringWriter(), Protokollstufe.Warnung);
        using var client = new HttpClient();

        var json = await client.GetStringAsync(new Uri(new Uri(server.Adresse), "api/commits"));

        using var dokument = JsonDocument.Parse(json);
        var eintraege = dokument.RootElement.EnumerateArray()
            .Select(e => (e.GetProperty("hash").GetString(), e.GetProperty("kurzHash").GetString(), e.GetProperty("betreff").GetString()))
            .ToList();
        Assert.That(eintraege, Is.EqualTo(new[]
        {
            (HashC, "c3d4e5f", "<script>alert(1)</script>"),
            (HashA, "a1b2c3d", "Erster Commit"),
        }));
    }

    [Test]
    public async Task Wenn_Startseite_abgerufen_dann_eingebettete_Oberflaeche_mit_Schutzkoepfen()
    {
        await using var server = await StarteServer(new StringWriter(), Protokollstufe.Warnung);
        using var client = new HttpClient();

        var antwort = await client.GetAsync(server.Adresse);
        var inhalt = await antwort.Content.ReadAsStringAsync();

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(antwort.Content.Headers.ContentType?.MediaType, Is.EqualTo("text/html"));
        Assert.That(inhalt, Does.Contain("id=\"commit-liste\""));
        Assert.That(antwort.Headers.GetValues("Content-Security-Policy").Single(), Does.Contain("default-src 'self'"));
        Assert.That(antwort.Headers.GetValues("X-Content-Type-Options").Single(), Is.EqualTo("nosniff"));
    }

    [Test]
    public async Task Wenn_Datei_der_Oberflaeche_abgerufen_dann_mit_Inhaltstyp_und_unbekannte_mit_404()
    {
        await using var server = await StarteServer(new StringWriter(), Protokollstufe.Warnung);
        using var client = new HttpClient();

        var css = await client.GetAsync(new Uri(new Uri(server.Adresse), "kd-tokens.css"));
        var unbekannt = await client.GetAsync(new Uri(new Uri(server.Adresse), "gibt-es-nicht.js"));

        Assert.That(css.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(css.Content.Headers.ContentType?.MediaType, Is.EqualTo("text/css"));
        Assert.That(unbekannt.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
    }

    [TestCase("fremd.example")]
    [TestCase("localhost")]
    [TestCase("127.0.0.1")]
    public async Task Wenn_Host_fremd_dann_4xx_und_eigener_Host_200(string fremderHost)
    {
        await using var server = await StarteServer(new StringWriter(), Protokollstufe.Warnung);
        using var client = new HttpClient();
        var eigenerHost = new Uri(server.Adresse).Authority;

        var fremd = await AbrufMitHost(client, server, "api/zustand", fremderHost);
        var fremdMitPort = await AbrufMitHost(client, server, "api/zustand", $"{fremderHost}:{new Uri(server.Adresse).Port + 1}");
        var startseiteFremd = await AbrufMitHost(client, server, "", fremderHost);
        var eigen = await AbrufMitHost(client, server, "api/zustand", eigenerHost);

        Assert.That((int)fremd, Is.InRange(400, 499));
        Assert.That((int)fremdMitPort, Is.InRange(400, 499));
        Assert.That((int)startseiteFremd, Is.InRange(400, 499));
        Assert.That(eigen, Is.EqualTo(HttpStatusCode.OK));
    }

    [Test]
    public async Task Wenn_zwei_Server_ohne_Port_dann_verschiedene_Ports()
    {
        await using var erster = await StarteServer(new StringWriter(), Protokollstufe.Warnung);
        await using var zweiter = await StarteServer(new StringWriter(), Protokollstufe.Warnung);

        Assert.That(new Uri(erster.Adresse).Port, Is.Not.EqualTo(new Uri(zweiter.Adresse).Port));
    }

    [Test]
    public async Task Wenn_verbose_dann_Debug_Zeile_je_Anfrage_und_bei_Standardstufe_nichts()
    {
        var verboseZiel = new StringWriter();
        var standardZiel = new StringWriter();
        await using var verbose = await StarteServer(verboseZiel, Protokollstufe.Debug);
        await using var standard = await StarteServer(standardZiel, Protokollstufe.Warnung);
        using var client = new HttpClient();

        await client.GetStringAsync(new Uri(new Uri(verbose.Adresse), "api/commits"));
        await client.GetStringAsync(new Uri(new Uri(standard.Adresse), "api/commits"));

        Assert.That(verboseZiel.ToString(), Does.Match(@"DEBUG \[Anfrage\] GET /api/commits"));
        Assert.That(standardZiel.ToString(), Is.Empty);
    }

    [Test]
    public async Task Wenn_Muster_gesetzt_dann_Zustand_traegt_sie_in_Aufrufreihenfolge()
    {
        await using var server = await StarteServer(new StringWriter(), Protokollstufe.Warnung, new Musterliste(["*.lock", "build/**"]));
        using var client = new HttpClient();

        var json = await client.GetStringAsync(new Uri(new Uri(server.Adresse), "api/zustand"));
        using var dokument = JsonDocument.Parse(json);
        var muster = dokument.RootElement.GetProperty("muster").EnumerateArray().Select(e => e.GetString()).ToList();

        Assert.That(muster, Is.EqualTo(new[] { "*.lock", "build/**" }));
    }

    [Test]
    public async Task Wenn_kein_Muster_dann_Zustand_traegt_leere_Liste()
    {
        await using var server = await StarteServer(new StringWriter(), Protokollstufe.Warnung);
        using var client = new HttpClient();

        var json = await client.GetStringAsync(new Uri(new Uri(server.Adresse), "api/zustand"));
        using var dokument = JsonDocument.Parse(json);
        var muster = dokument.RootElement.GetProperty("muster").EnumerateArray().ToList();

        Assert.That(muster, Is.Empty);
    }

    [Test]
    public async Task Wenn_Muster_gesetzt_dann_Debug_Zeile_nennt_Zahl_und_Laengen_nicht_den_Wortlaut()
    {
        var ziel = new StringWriter();
        await using var server = await StarteServer(ziel, Protokollstufe.Debug, new Musterliste(["*.lock"]));

        var ausgabe = ziel.ToString();

        Assert.That(ausgabe, Does.Contain("1 Muster"));
        Assert.That(ausgabe, Does.Contain("5"));
        Assert.That(ausgabe, Does.Not.Contain("*.lock"));
    }

    private static async Task<Webserver> StarteServer(StringWriter ziel, Protokollstufe mindeststufe, Musterliste? muster = null)
    {
        var commits = new Commitzeilen([
            new Commitzeile(HashC, "<i>Mallory</i>", "2026-03-05T18:30:00+01:00", "<script>alert(1)</script>", "Zeile eins\nZeile zwei"),
            new Commitzeile(HashA, "Anna Beispiel", "2026-03-04T09:15:00+01:00", "Erster Commit", ""),
        ]);
        var protokoll = new StderrProtokoll(ziel, TimeProvider.System, mindeststufe);
        return await Webserver.StartenAsync(0, commits, TestDateiquelle.Leer(), TestDiffquelle.Leer(), TestUebersichtsquelle.Leer(), TestZusammenquelle.Leer(), Oberflaeche.AusDemProgramm(), protokoll, muster: muster);
    }

    private static async Task<HttpStatusCode> AbrufMitHost(HttpClient client, Webserver server, string pfad, string host)
    {
        using var anfrage = new HttpRequestMessage(HttpMethod.Get, new Uri(new Uri(server.Adresse), pfad));
        anfrage.Headers.Host = host;
        using var antwort = await client.SendAsync(anfrage);
        return antwort.StatusCode;
    }
}
