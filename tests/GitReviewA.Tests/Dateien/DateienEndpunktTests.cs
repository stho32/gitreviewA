using System.Net;
using System.Text.Json;
using GitReviewA.Fremdtext;
using GitReviewA.Git;
using GitReviewA.Protokoll;
using GitReviewA.Server;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Dateien;

public class DateienEndpunktTests
{
    private const string HashP = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";
    private const string HashQ = "c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6";
    private const string HashNichtUebergeben = "e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6a7b8";

    [Test]
    public async Task Wenn_voller_Hash_der_Auswahl_dann_200_mit_Dateien_in_Reihenfolge_der_Quelle_und_ein_Lesevorgang()
    {
        var quelle = new TestDateiquelle(new() { [HashP] = DateienVonP() });
        await using var server = await StarteServer(quelle, new StringWriter(), Protokollstufe.Warnung);
        using var client = new HttpClient();

        var antwort = await client.GetAsync(DateienAdresse(server, HashP));
        var json = await antwort.Content.ReadAsStringAsync();

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(json, Is.EqualTo("""[{"status":"A","pfad":"README.md","alterPfad":null,"plus":2,"minus":0},{"status":"R","pfad":"LIESMICH.md","alterPfad":"README.md","plus":0,"minus":0},{"status":"A","pfad":"logo.bin","alterPfad":null,"plus":null,"minus":null}]"""));
        Assert.That(quelle.Lesevorgaenge, Is.EqualTo(1));
    }

    [Test]
    public async Task Wenn_ein_Name_kein_gueltiges_UTF_8_ist_dann_zeigt_die_Dateiliste_ihn_mit_Marke_und_ohne_seine_Bytes()
    {
        var mitRohpfad = new Dateiaenderung("A", "a⟨0xFF⟩.sh", null, 1, 0, new Rohname([0x61, 0xFF, 0x2E, 0x73, 0x68]));
        var quelle = new TestDateiquelle(new() { [HashP] = new Dateiaenderungen([mitRohpfad]) });
        await using var server = await StarteServer(quelle, new StringWriter(), Protokollstufe.Warnung);
        using var client = new HttpClient();

        var json = await client.GetStringAsync(DateienAdresse(server, HashP));

        Assert.That(json, Is.EqualTo("""[{"status":"A","pfad":"a\u27E80xFF\u27E9.sh","alterPfad":null,"plus":1,"minus":0}]"""));
    }

    [Test]
    public async Task Wenn_Hash_in_Grossbuchstaben_dann_gelesen_mit_der_Schreibweise_der_Auswahl()
    {
        var quelle = new TestDateiquelle(new() { [HashP] = DateienVonP() });
        await using var server = await StarteServer(quelle, new StringWriter(), Protokollstufe.Warnung);
        using var client = new HttpClient();

        var antwort = await client.GetAsync(DateienAdresse(server, HashP.ToUpperInvariant()));

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(quelle.Lesevorgaenge, Is.EqualTo(1));
    }

    [TestCase("HEAD")]
    [TestCase("--output=pwn")]
    [TestCase(HashNichtUebergeben)]
    [TestCase("a1b2c3d")]
    [TestCase("a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d")]
    [TestCase("a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4 ")]
    [TestCase("a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4~1")]
    public async Task Wenn_kein_voller_Hash_der_Auswahl_dann_404_ohne_Lesevorgang(string fremd)
    {
        var quelle = new TestDateiquelle(new() { [HashP] = DateienVonP() });
        await using var server = await StarteServer(quelle, new StringWriter(), Protokollstufe.Warnung);
        using var client = new HttpClient();

        var antwort = await client.GetAsync(DateienAdresse(server, fremd));

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
        Assert.That(quelle.Lesevorgaenge, Is.Zero);
    }

    [Test]
    public async Task Wenn_Dateiliste_nicht_lesbar_dann_500_mit_Meldung_und_Fehlerzeile_mit_Hash()
    {
        var quelle = new TestDateiquelle(new() { [HashP] = DateienVonP() }, scheitertFuer: HashQ);
        var protokollziel = new StringWriter();
        await using var server = await StarteServer(quelle, protokollziel, Protokollstufe.Warnung);
        using var client = new HttpClient();

        var antwort = await client.GetAsync(DateienAdresse(server, HashQ));
        var json = await antwort.Content.ReadAsStringAsync();
        var danachP = await client.GetAsync(DateienAdresse(server, HashP));

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.InternalServerError));
        Assert.That(json, Is.EqualTo("""{"meldung":"Dateien konnten nicht gelesen werden"}"""));
        var fehlerzeilen = protokollziel.ToString().Split('\n').Where(zeile => zeile.Contains(" FEHLER ")).ToList();
        Assert.That(fehlerzeilen, Has.Count.EqualTo(1));
        Assert.That(fehlerzeilen[0], Does.Contain("[Dateien]").And.Contain(HashQ));
        Assert.That(danachP.StatusCode, Is.EqualTo(HttpStatusCode.OK));
    }

    [Test]
    public async Task Wenn_verbose_dann_Debug_Zeile_mit_vollem_Hash_je_Lesevorgang_und_keine_fuer_404()
    {
        var quelle = new TestDateiquelle(new() { [HashP] = DateienVonP() });
        var protokollziel = new StringWriter();
        await using var server = await StarteServer(quelle, protokollziel, Protokollstufe.Debug);
        using var client = new HttpClient();

        await client.GetAsync(DateienAdresse(server, HashP));
        await client.GetAsync(DateienAdresse(server, "HEAD"));

        var zeilen = protokollziel.ToString().Split('\n');
        Assert.That(zeilen.Count(zeile => zeile.Contains($"DEBUG [Anfrage] GET /api/commits/{HashP}/dateien")), Is.EqualTo(1));
        Assert.That(zeilen.Count(zeile => zeile.Contains("HEAD")), Is.Zero);
    }

    [Test]
    public async Task Wenn_Commits_abgefragt_dann_mit_Autor_Datum_und_Rumpf()
    {
        await using var server = await StarteServer(TestDateiquelle.Leer(), new StringWriter(), Protokollstufe.Warnung);
        using var client = new HttpClient();

        var json = await client.GetStringAsync(new Uri(new Uri(server.Adresse), "api/commits"));

        using var dokument = JsonDocument.Parse(json);
        var q = dokument.RootElement[1];
        Assert.That(q.GetProperty("hash").GetString(), Is.EqualTo(HashQ));
        Assert.That(q.GetProperty("kurzHash").GetString(), Is.EqualTo("c3d4e5f"));
        Assert.That(q.GetProperty("autor").GetString(), Is.EqualTo("Bernd Beispiel"));
        Assert.That(q.GetProperty("datum").GetString(), Is.EqualTo("2026-03-05T18:30:00+01:00"));
        Assert.That(q.GetProperty("betreff").GetString(), Is.EqualTo("Dateien ändern"));
        Assert.That(q.GetProperty("rumpf").GetString(), Is.EqualTo("Zeile eins\nZeile zwei"));
    }

    private static Dateiaenderungen DateienVonP()
    {
        return new Dateiaenderungen([
            new Dateiaenderung("A", "README.md", null, 2, 0),
            new Dateiaenderung("R", "LIESMICH.md", "README.md", 0, 0),
            new Dateiaenderung("A", "logo.bin", null, null, null),
        ]);
    }

    private static Uri DateienAdresse(Webserver server, string hash)
    {
        return new Uri(new Uri(server.Adresse), $"api/commits/{Uri.EscapeDataString(hash)}/dateien");
    }

    private static async Task<Webserver> StarteServer(TestDateiquelle quelle, StringWriter protokollziel, Protokollstufe mindeststufe)
    {
        var commits = new Commitzeilen([
            new Commitzeile(HashP, "Anna Beispiel", "2026-03-04T09:15:00+01:00", "Start", ""),
            new Commitzeile(HashQ, "Bernd Beispiel", "2026-03-05T18:30:00+01:00", "Dateien ändern", "Zeile eins\nZeile zwei"),
        ]);
        var protokoll = new StderrProtokoll(protokollziel, TimeProvider.System, mindeststufe);
        return await Webserver.StartenAsync(0, commits, quelle, TestDiffquelle.Leer(), TestUebersichtsquelle.Leer(), Oberflaeche.AusDemProgramm(), protokoll);
    }
}
