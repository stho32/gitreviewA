using System.Net;
using System.Text.Json;
using GitReviewA.Dateien;
using GitReviewA.Diff;
using GitReviewA.Git;
using GitReviewA.Protokoll;
using GitReviewA.Server;
using GitReviewA.Sprung;
using GitReviewA.Tests.Hilfen;
using GitReviewA.Zusammen;

namespace GitReviewA.Tests.Server;

/// <summary>
/// B2006: der Endpunkt `GET /api/commits/{hash}/sprung` — 200 `{ziel, geaendert, grund}`, 400 ohne `pfad`, 404 bei Hash außerhalb
/// der Aufrufmenge oder Pfad außerhalb der Dateiliste (ohne Arbeitsbaumprüfung), 200 mit Grund bei abgelehntem Namen, 500 bei
/// unlesbarer Dateiliste. Nur hinter der Host-Prüfung und ohne CORS-Freigabe.
/// </summary>
public class SprungEndpunktTests
{
    private const string HashP = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";
    private const string HashQ = "c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6";
    private const string Wurzel = "/repo-wurzel";

    [Test]
    public async Task Wenn_alles_gueltig_ist_dann_200_mit_Ziel_ohne_Zeile_und_leerem_Grund()
    {
        await using var server = await StarteServer();

        var (status, wurzel) = await Sprung(server, HashP, "src/a.txt");

        Assert.That(status, Is.EqualTo(HttpStatusCode.OK));
        Assert.That((wurzel.GetProperty("ziel").GetString(), wurzel.GetProperty("geaendert").GetBoolean(), wurzel.GetProperty("grund").GetString()),
            Is.EqualTo(("vscode://file/repo-wurzel/src/a.txt", false, "")));
    }

    [Test]
    public async Task Wenn_die_Datei_seit_dem_Commit_geaendert_ist_dann_geaendert_wahr()
    {
        var quelle = new TestSprungquelle(Wurzel).SetzeGeaendert(HashP, "src/a.txt");
        await using var server = await StarteServer(quelle);

        var (status, wurzel) = await Sprung(server, HashP, "src/a.txt");

        Assert.That(status, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(wurzel.GetProperty("geaendert").GetBoolean(), Is.True);
    }

    [Test]
    public async Task Wenn_die_Datei_im_Arbeitsbaum_fehlt_dann_200_mit_Grund_und_ohne_Ziel()
    {
        var quelle = new TestSprungquelle(Wurzel).SetzeVorhanden("/repo-wurzel/src/a.txt", Sprungvorhandensein.Fehlt);
        await using var server = await StarteServer(quelle);

        var (status, wurzel) = await Sprung(server, HashP, "src/a.txt");

        Assert.That(status, Is.EqualTo(HttpStatusCode.OK));
        Assert.That((wurzel.GetProperty("ziel").GetString(), wurzel.GetProperty("grund").GetString()),
            Is.EqualTo(("", Sprunggruende.DateiFehlt)));
    }

    [TestCase("api/commits/" + HashP + "/sprung")]
    [TestCase("api/commits/" + HashP + "/sprung?geaendert=true")]
    public async Task Wenn_ohne_pfad_dann_400_ohne_Arbeitsbaumpruefung(string adresse)
    {
        var quelle = new TestSprungquelle(Wurzel);
        await using var server = await StarteServer(quelle);

        var antwort = await new HttpClient().GetAsync(new Uri(new Uri(server.Adresse), adresse));

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
        Assert.That(quelle.Arbeitsbaumpruefungen, Is.Zero);
    }

    [TestCase("0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f", "src/a.txt")]
    [TestCase("HEAD", "src/a.txt")]
    [TestCase(HashQ, "src/a.txt")]
    [TestCase(HashP, "nicht-da.txt")]
    [TestCase(HashP, "SRC/A.TXT")]
    [TestCase(HashP, "--output=pwn")]
    [TestCase(HashP, "../README.md")]
    public async Task Wenn_Hash_oder_Pfad_nicht_passen_dann_404_ohne_Arbeitsbaumpruefung(string hash, string pfad)
    {
        var quelle = new TestSprungquelle(Wurzel);
        await using var server = await StarteServer(quelle);

        var antwort = await new HttpClient().GetAsync(new Uri(new Uri(server.Adresse), $"api/commits/{hash}/sprung?pfad={Uri.EscapeDataString(pfad)}"));

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
        Assert.That(quelle.Arbeitsbaumpruefungen, Is.Zero);
    }

    [Test]
    public async Task Wenn_die_Dateiliste_nicht_lesbar_ist_dann_500()
    {
        var dateiquelle = new TestDateiquelle(new Dictionary<string, Dateiaenderungen>(), scheitertFuer: HashP);
        await using var server = await StarteServer(dateiquelle: dateiquelle);

        var antwort = await new HttpClient().GetAsync(new Uri(new Uri(server.Adresse), $"api/commits/{HashP}/sprung?pfad=src%2Fa.txt"));

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.InternalServerError));
    }

    [Test]
    public async Task Wenn_der_Host_fremd_ist_dann_4xx_und_keine_CORS_Freigabe()
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();
        using var anfrage = new HttpRequestMessage(HttpMethod.Get, new Uri(new Uri(server.Adresse), $"api/commits/{HashP}/sprung?pfad=src%2Fa.txt"));
        anfrage.Headers.Host = "fremd.example";

        var fremd = await client.SendAsync(anfrage);
        var eigen = await client.GetAsync(new Uri(new Uri(server.Adresse), $"api/commits/{HashP}/sprung?pfad=src%2Fa.txt"));

        Assert.That((int)fremd.StatusCode, Is.InRange(400, 499));
        Assert.That(eigen.Headers.Contains("Access-Control-Allow-Origin"), Is.False);
    }

    private static async Task<(HttpStatusCode Status, JsonElement Inhalt)> Sprung(Webserver server, string hash, string pfad)
    {
        using var client = new HttpClient();
        var antwort = await client.GetAsync(new Uri(new Uri(server.Adresse), $"api/commits/{hash}/sprung?pfad={Uri.EscapeDataString(pfad)}"));
        var text = await antwort.Content.ReadAsStringAsync();
        using var dokument = JsonDocument.Parse(text);
        return (antwort.StatusCode, dokument.RootElement.Clone());
    }

    private static async Task<Webserver> StarteServer(TestSprungquelle? sprung = null, TestDateiquelle? dateiquelle = null)
    {
        var commits = new Commitzeilen([new Commitzeile(HashP, "Anna Beispiel", "2026-03-04T09:15:00+01:00", "Start", "")]);
        var protokoll = new StderrProtokoll(new StringWriter(), TimeProvider.System, Protokollstufe.Warnung);
        var dateien = dateiquelle ?? new TestDateiquelle(new Dictionary<string, Dateiaenderungen>
        {
            [HashP] = new([new Dateiaenderung("A", "src/a.txt", null, 1, 0), new Dateiaenderung("M", "weg.txt", null, 1, 1)]),
        });
        return await Webserver.StartenAsync(0, commits, dateien, TestDiffquelle.Leer(), TestUebersichtsquelle.Leer(), TestZusammenquelle.Leer(), Oberflaeche.AusDemProgramm(), protokoll, sprung ?? new TestSprungquelle(Wurzel));
    }
}
