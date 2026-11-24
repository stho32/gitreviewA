using System.Net;
using System.Text.Json;
using GitReviewA.Git;
using GitReviewA.Protokoll;
using GitReviewA.Server;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Diff;

public class DiffEndpunktTests
{
    private const string HashP = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";
    private const string HashQ = "c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6";
    private const string HashNichtUebergeben = "e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6a7b8";
    private const string PatchVonB = "@@ -1,2 +1,3 @@\n eins\n-zwei\n+ZWEI\n+drei\n";

    [Test]
    public async Task Wenn_Pfad_in_der_Dateiliste_dann_200_mit_Pfad_Status_Art_und_Patch_aus_einem_Diff_Lesevorgang()
    {
        var dateien = new TestDateiquelle(new() { [HashQ] = DateienVonQ() });
        var diffquelle = new TestDiffquelle(PatchVonB);
        await using var server = await StarteServer(dateien, diffquelle, new StringWriter(), Protokollstufe.Warnung);
        using var client = new HttpClient();

        var antwort = await client.GetAsync(DiffAdresse(server, HashQ, "src/b.txt"));
        var json = await antwort.Content.ReadAsStringAsync();

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        using var dokument = JsonDocument.Parse(json);
        var felder = dokument.RootElement.EnumerateObject().Select(feld => (feld.Name, feld.Value.ToString())).ToArray();
        Assert.That(felder, Is.EqualTo(new[] { ("pfad", "src/b.txt"), ("status", "M"), ("alterPfad", ""), ("art", "text"), ("patch", PatchVonB) }));
        Assert.That(dokument.RootElement.GetProperty("alterPfad").ValueKind, Is.EqualTo(JsonValueKind.Null));
        Assert.That(diffquelle.Lesevorgaenge, Is.EqualTo(1));
        Assert.That(diffquelle.ZuletztGelesen, Is.EqualTo(new Dateiaenderung("M", "src/b.txt", null, 2, 1)));
    }

    [Test]
    public async Task Wenn_umbenannte_Datei_dann_liest_der_Diff_mit_dem_alten_Pfad()
    {
        var dateien = new TestDateiquelle(new() { [HashQ] = DateienVonQ() });
        var diffquelle = new TestDiffquelle("@@ -1 +1 @@\n-a\n+b\n");
        await using var server = await StarteServer(dateien, diffquelle, new StringWriter(), Protokollstufe.Warnung);
        using var client = new HttpClient();

        var antwort = await client.GetAsync(DiffAdresse(server, HashQ, "neu.txt"));

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(diffquelle.ZuletztGelesen, Is.EqualTo(new Dateiaenderung("R", "neu.txt", "alt.txt", 1, 1)));
    }

    [TestCase("LIESMICH.md", "leer")]
    [TestCase("logo.bin", "binaer")]
    public async Task Wenn_Datei_ohne_Zeilen_dann_200_mit_Art_ohne_Diff_Lesevorgang(string pfad, string art)
    {
        var dateien = new TestDateiquelle(new() { [HashQ] = DateienVonQ() });
        var diffquelle = new TestDiffquelle(PatchVonB);
        await using var server = await StarteServer(dateien, diffquelle, new StringWriter(), Protokollstufe.Warnung);
        using var client = new HttpClient();

        var json = await client.GetStringAsync(DiffAdresse(server, HashQ, pfad));

        Assert.That(json, Does.Contain($"\"art\":\"{art}\"").And.Contain("\"patch\":\"\""));
        Assert.That(diffquelle.Lesevorgaenge, Is.Zero);
    }

    [TestCase("nicht-da.txt")]
    [TestCase("../README.md")]
    [TestCase("--output=pwn")]
    [TestCase("src")]
    [TestCase("SRC/B.TXT")]
    [TestCase(":(top)src/b.txt")]
    [TestCase("*.txt")]
    [TestCase("src/b.txt ")]
    [TestCase("")]
    public async Task Wenn_Pfad_nicht_genau_in_der_Dateiliste_dann_404_ohne_Diff_Lesevorgang(string pfad)
    {
        var dateien = new TestDateiquelle(new() { [HashQ] = DateienVonQ() });
        var diffquelle = new TestDiffquelle(PatchVonB);
        await using var server = await StarteServer(dateien, diffquelle, new StringWriter(), Protokollstufe.Warnung);
        using var client = new HttpClient();

        var antwort = await client.GetAsync(DiffAdresse(server, HashQ, pfad));

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
        Assert.That(diffquelle.Lesevorgaenge, Is.Zero);
    }

    [Test]
    public async Task Wenn_ohne_pfad_dann_400_ohne_Lesevorgang()
    {
        var dateien = new TestDateiquelle(new() { [HashQ] = DateienVonQ() });
        var diffquelle = new TestDiffquelle(PatchVonB);
        await using var server = await StarteServer(dateien, diffquelle, new StringWriter(), Protokollstufe.Warnung);
        using var client = new HttpClient();

        var antwort = await client.GetAsync(new Uri(new Uri(server.Adresse), $"api/commits/{HashQ}/diff"));

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
        Assert.That(dateien.Lesevorgaenge + diffquelle.Lesevorgaenge, Is.Zero);
    }

    [TestCase("HEAD")]
    [TestCase(HashNichtUebergeben)]
    [TestCase("c3d4e5f")]
    [TestCase("--output=pwn")]
    public async Task Wenn_kein_voller_Hash_der_Auswahl_dann_404_ohne_Lesevorgang(string fremd)
    {
        var dateien = new TestDateiquelle(new() { [HashQ] = DateienVonQ() });
        var diffquelle = new TestDiffquelle(PatchVonB);
        await using var server = await StarteServer(dateien, diffquelle, new StringWriter(), Protokollstufe.Warnung);
        using var client = new HttpClient();

        var antwort = await client.GetAsync(DiffAdresse(server, fremd, "src/b.txt"));

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
        Assert.That(dateien.Lesevorgaenge + diffquelle.Lesevorgaenge, Is.Zero);
    }

    [Test]
    public async Task Wenn_mehrere_Diffs_desselben_Commits_dann_wird_seine_Dateiliste_einmal_gelesen()
    {
        var dateien = new TestDateiquelle(new() { [HashQ] = DateienVonQ() });
        await using var server = await StarteServer(dateien, new TestDiffquelle(PatchVonB), new StringWriter(), Protokollstufe.Warnung);
        using var client = new HttpClient();

        await client.GetAsync(DiffAdresse(server, HashQ, "nicht-da.txt"));
        await client.GetAsync(DiffAdresse(server, HashQ, "src/b.txt"));
        await client.GetAsync(DiffAdresse(server, HashQ, "logo.bin"));

        Assert.That(dateien.Lesevorgaenge, Is.EqualTo(1));
    }

    [Test]
    public async Task Wenn_die_Dateiliste_schon_angezeigt_wurde_dann_liest_der_Diff_sie_nicht_noch_einmal()
    {
        var dateien = new TestDateiquelle(new() { [HashQ] = DateienVonQ() });
        await using var server = await StarteServer(dateien, new TestDiffquelle(PatchVonB), new StringWriter(), Protokollstufe.Warnung);
        using var client = new HttpClient();

        await client.GetAsync(new Uri(new Uri(server.Adresse), $"api/commits/{HashQ}/dateien"));
        await client.GetAsync(DiffAdresse(server, HashQ, "src/b.txt"));

        Assert.That(dateien.Lesevorgaenge, Is.EqualTo(1));
    }

    [Test]
    public async Task Wenn_Diff_nicht_lesbar_dann_500_mit_Meldung_und_einer_Fehlerzeile_mit_Hash_und_Pfad()
    {
        var dateien = new TestDateiquelle(new() { [HashQ] = DateienVonQ(), [HashP] = DateienVonQ() });
        var protokollziel = new StringWriter();
        await using var server = await StarteServer(dateien, new TestDiffquelle(PatchVonB, scheitertFuer: HashQ), protokollziel, Protokollstufe.Warnung);
        using var client = new HttpClient();

        var antwort = await client.GetAsync(DiffAdresse(server, HashQ, "src/b.txt"));
        var json = await antwort.Content.ReadAsStringAsync();
        var danachP = await client.GetAsync(DiffAdresse(server, HashP, "src/b.txt"));

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.InternalServerError));
        Assert.That(json, Is.EqualTo("""{"meldung":"Diff konnte nicht gelesen werden"}"""));
        var fehlerzeilen = protokollziel.ToString().Split('\n').Where(zeile => zeile.Contains(" FEHLER ")).ToList();
        Assert.That(fehlerzeilen, Has.Count.EqualTo(1));
        Assert.That(fehlerzeilen[0], Does.Contain("[Diff]").And.Contain(HashQ).And.Contain("src/b.txt"));
        Assert.That(danachP.StatusCode, Is.EqualTo(HttpStatusCode.OK));
    }

    [Test]
    public async Task Wenn_Dateiliste_fuer_den_Diff_nicht_lesbar_dann_500_und_Fehlerzeile_ohne_den_angefragten_Pfad()
    {
        var dateien = new TestDateiquelle([], scheitertFuer: HashQ);
        var protokollziel = new StringWriter();
        await using var server = await StarteServer(dateien, new TestDiffquelle(PatchVonB), protokollziel, Protokollstufe.Warnung);
        using var client = new HttpClient();

        var antwort = await client.GetAsync(DiffAdresse(server, HashQ, "markenwort-xyz.txt"));

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.InternalServerError));
        var fehlerzeilen = protokollziel.ToString().Split('\n').Where(zeile => zeile.Contains(" FEHLER ")).ToList();
        Assert.That(fehlerzeilen, Has.Count.EqualTo(1));
        Assert.That(fehlerzeilen[0], Does.Contain(HashQ).And.Not.Contain("markenwort"));
    }

    [Test]
    public async Task Wenn_verbose_dann_je_gelesenem_Diff_eine_Debug_Zeile_mit_vollem_Hash_und_abgewiesene_Pfade_nur_als_Laenge()
    {
        var dateien = new TestDateiquelle(new() { [HashQ] = DateienVonQ() });
        var protokollziel = new StringWriter();
        await using var server = await StarteServer(dateien, new TestDiffquelle(PatchVonB), protokollziel, Protokollstufe.Debug);
        using var client = new HttpClient();

        await client.GetAsync(DiffAdresse(server, HashQ.ToUpperInvariant(), "src/b.txt"));
        await client.GetAsync(DiffAdresse(server, HashQ, "markenwort-xyz.txt"));

        var zeilen = protokollziel.ToString().Split('\n');
        Assert.That(zeilen.Count(zeile => zeile.Contains($"GET /api/commits/{HashQ}/diff")), Is.EqualTo(1));
        Assert.That(zeilen.Count(zeile => zeile.Contains($"GET /api/commits/{HashQ}/diff Datei src/b.txt")), Is.EqualTo(1));
        Assert.That(zeilen.Count(zeile => zeile.Contains("markenwort")), Is.Zero);
        Assert.That(zeilen.Count(zeile => zeile.Contains("Länge 18")), Is.EqualTo(1));
    }

    private static Dateiaenderungen DateienVonQ()
    {
        return new Dateiaenderungen([
            new Dateiaenderung("M", "src/b.txt", null, 2, 1),
            new Dateiaenderung("R", "LIESMICH.md", "README.md", 0, 0),
            new Dateiaenderung("R", "neu.txt", "alt.txt", 1, 1),
            new Dateiaenderung("A", "logo.bin", null, null, null),
        ]);
    }

    private static Uri DiffAdresse(Webserver server, string hash, string pfad)
    {
        return new Uri(new Uri(server.Adresse), $"api/commits/{Uri.EscapeDataString(hash)}/diff?pfad={Uri.EscapeDataString(pfad)}");
    }

    private static async Task<Webserver> StarteServer(TestDateiquelle dateien, TestDiffquelle diffquelle, StringWriter protokollziel, Protokollstufe mindeststufe)
    {
        var commits = new Commitzeilen([
            new Commitzeile(HashP, "Anna Beispiel", "2026-03-04T09:15:00+01:00", "Start", ""),
            new Commitzeile(HashQ, "Bernd Beispiel", "2026-03-05T18:30:00+01:00", "Dateien ändern", ""),
        ]);
        var protokoll = new StderrProtokoll(protokollziel, TimeProvider.System, mindeststufe);
        return await Webserver.StartenAsync(0, commits, dateien, diffquelle, Oberflaeche.AusDemProgramm(), protokoll);
    }
}
