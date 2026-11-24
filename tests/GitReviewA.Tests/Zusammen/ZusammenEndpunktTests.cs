using System.Net;
using System.Text.Json;
using GitReviewA.Diff;
using GitReviewA.Fremdtext;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Protokoll;
using GitReviewA.Server;
using GitReviewA.Tests.Hilfen;
using GitReviewA.Zusammen;

namespace GitReviewA.Tests.Zusammen;

/// <summary>
/// B1407: die beiden GET-Endpunkte der Zusammen-Ansicht — Netto-Liste (200, einmal gelesen, 500 bei unlesbar) und Diff je Datei
/// (200 netto bzw. Abschnitte, 400 ohne `pfad` oder mit unbekanntem `umfang`, 404 außerhalb der Liste ohne git-Aufruf, 422 bei
/// nicht eindeutigem Anzeigenamen). Beide nur hinter der Host-Prüfung und ohne CORS-Freigabe.
/// </summary>
public class ZusammenEndpunktTests
{
    private const string HashP = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";
    private const string HashQ = "c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6";
    private const string Patch = "@@ -0,0 +1,4 @@\n+eins\n+ZWEI\n+drei\n+vier\n";

    [Test]
    public async Task Wenn_Liste_abgerufen_dann_200_lueckenlos_mit_Basis_Beschriftung_und_Stellen()
    {
        var quelle = LueckenlosQuelle();
        await using var server = await StarteServer(quelle: quelle);

        var json = await new HttpClient().GetStringAsync(new Uri(new Uri(server.Adresse), "api/zusammen"));

        using var dokument = JsonDocument.Parse(json);
        var wurzel = dokument.RootElement;
        Assert.That((wurzel.GetProperty("lueckenlos").GetBoolean(), wurzel.GetProperty("basis").GetString(), wurzel.GetProperty("beschriftung").GetString()),
            Is.EqualTo((true, "", "lückenlos · netto")));
        var datei = wurzel.GetProperty("dateien").EnumerateArray().Single();
        Assert.That((datei.GetProperty("pfad").GetString(), datei.GetProperty("status").GetString(), datei.GetProperty("plus").GetInt32(), datei.GetProperty("minus").GetInt32(), datei.GetProperty("zustaendiger").GetString()),
            Is.EqualTo(("src/a.txt", "A", 4, 0, HashQ)));
        Assert.That(datei.GetProperty("stellen").EnumerateArray().Select(stelle => (stelle.GetProperty("commit").GetString(), stelle.GetProperty("pfad").GetString())),
            Is.EqualTo(new[] { (HashP, "src/a.txt"), (HashQ, "src/a.txt") }));
    }

    [Test]
    public async Task Wenn_die_Liste_zweimal_gelesen_wird_dann_ein_Netto_Lesevorgang()
    {
        var quelle = LueckenlosQuelle();
        await using var server = await StarteServer(quelle: quelle);
        using var client = new HttpClient();

        await client.GetStringAsync(new Uri(new Uri(server.Adresse), "api/zusammen"));
        await client.GetStringAsync(new Uri(new Uri(server.Adresse), "api/zusammen"));

        Assert.That(quelle.NettoLesevorgaenge, Is.EqualTo(1), "Commits sind unveränderlich, die Liste wird einmal gelesen");
        Assert.That(quelle.NettoDiffLesevorgaenge, Is.Zero, "der Diff wird nie vorab gelesen");
    }

    [Test]
    public async Task Wenn_lueckenlos_dann_200_Diff_netto_mit_den_Commits_der_Stellen()
    {
        var quelle = LueckenlosQuelle();
        await using var server = await StarteServer(quelle: quelle);

        var json = await new HttpClient().GetStringAsync(new Uri(new Uri(server.Adresse), "api/zusammen/diff?pfad=src%2Fa.txt"));

        using var dokument = JsonDocument.Parse(json);
        var wurzel = dokument.RootElement;
        Assert.That((wurzel.GetProperty("netto").GetBoolean(), wurzel.GetProperty("art").GetString(), wurzel.GetProperty("patch").GetString()),
            Is.EqualTo((true, "text", Patch)));
        Assert.That(wurzel.GetProperty("commits").EnumerateArray().Select(wert => wert.GetString()), Is.EqualTo(new[] { HashP, HashQ }));
        Assert.That(wurzel.GetProperty("abschnitte").GetArrayLength(), Is.Zero);
        Assert.That(quelle.ZuletztUmfang, Is.EqualTo(Diffumfang.Aenderungen));
    }

    [Test]
    public async Task Wenn_ohne_Kette_dann_200_Abschnitte_je_Commit_und_kein_netto()
    {
        var uebersicht = TestUebersichtsquelle.MitDateien(
            new Commitdateien(HashP, new Dateiaenderungen([new Dateiaenderung("M", "src/a.txt", null, 1, 1)])),
            new Commitdateien(HashQ, new Dateiaenderungen([new Dateiaenderung("A", "src/b.txt", null, 1, 0)])));
        var quelle = new TestZusammenquelle { GegebeneElternfolge = new Elternfolge([new Elternzeile(HashP, ""), new Elternzeile(HashQ, "")]) };
        await using var server = await StarteServer(uebersicht, quelle, new TestDiffquelle(Patch));

        var json = await new HttpClient().GetStringAsync(new Uri(new Uri(server.Adresse), "api/zusammen/diff?pfad=src%2Fa.txt"));

        using var dokument = JsonDocument.Parse(json);
        var wurzel = dokument.RootElement;
        Assert.That((wurzel.GetProperty("netto").GetBoolean(), wurzel.GetProperty("art").GetString()),
            Is.EqualTo((false, "text")));
        var abschnitt = wurzel.GetProperty("abschnitte").EnumerateArray().Single();
        Assert.That((abschnitt.GetProperty("commit").GetString(), abschnitt.GetProperty("patch").GetString()), Is.EqualTo((HashP, Patch)));
        Assert.That(quelle.NettoDiffLesevorgaenge, Is.Zero, "ohne Kette gibt es keinen Netto-Diff");
    }

    [Test]
    public async Task Wenn_der_Anzeigename_nicht_eindeutig_ist_dann_422_ohne_Diff_Lesevorgang()
    {
        var literal = new Dateiaenderung("A", "f⟨0xFF⟩.txt", null, 1, 0);
        var roh = new Dateiaenderung("A", "f⟨0xFF⟩.txt", null, 1, 0, new Rohname("f\xFF.txt"u8.ToArray()));
        var uebersicht = TestUebersichtsquelle.MitDateien(new Commitdateien(HashP, new Dateiaenderungen([literal, roh])));
        var quelle = new TestZusammenquelle
        {
            GegebeneElternfolge = new Elternfolge([new Elternzeile(HashP, "")]),
            GegebeneNetto = new Dateiaenderungen([literal, roh]),
        };
        var diffquelle = new TestDiffquelle(Patch);
        await using var server = await StarteServer(uebersicht, quelle, diffquelle);

        var antwort = await new HttpClient().GetAsync(new Uri(new Uri(server.Adresse), "api/zusammen/diff?pfad=f%E2%9F%A80xFF%E2%9F%A9.txt"));

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.UnprocessableEntity));
        Assert.That(quelle.NettoDiffLesevorgaenge + diffquelle.Lesevorgaenge, Is.Zero);
    }

    [TestCase("api/zusammen/diff")]
    [TestCase("api/zusammen/diff?umfang=ganz")]
    [TestCase("api/zusammen/diff?pfad=src%2Fa.txt&umfang=voll")]
    [TestCase("api/zusammen/diff?pfad=src%2Fa.txt&umfang=GANZ")]
    public async Task Wenn_ohne_pfad_oder_mit_unbekanntem_Umfang_dann_400_ohne_Lesevorgang(string adresse)
    {
        var quelle = LueckenlosQuelle();
        await using var server = await StarteServer(quelle: quelle);

        var antwort = await new HttpClient().GetAsync(new Uri(new Uri(server.Adresse), adresse));

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
        Assert.That(quelle.NettoDiffLesevorgaenge, Is.Zero);
    }

    [TestCase("nicht-da.txt")]
    [TestCase("")]
    [TestCase("--output=pwn")]
    [TestCase("SRC/A.TXT")]
    public async Task Wenn_der_Pfad_nicht_in_der_Netto_Liste_steht_dann_404_ohne_Netto_Diff(string pfad)
    {
        var quelle = LueckenlosQuelle();
        await using var server = await StarteServer(quelle: quelle);

        var antwort = await new HttpClient().GetAsync(new Uri(new Uri(server.Adresse), $"api/zusammen/diff?pfad={Uri.EscapeDataString(pfad)}"));

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
        Assert.That(quelle.NettoDiffLesevorgaenge, Is.Zero);
    }

    [Test]
    public async Task Wenn_die_Netto_Aenderungen_nicht_lesbar_sind_dann_500_bei_Liste_und_Diff()
    {
        var uebersicht = TestUebersichtsquelle.MitDateien(new Commitdateien(HashP, new Dateiaenderungen([new Dateiaenderung("M", "src/a.txt", null, 1, 1)])));
        var quelle = new TestZusammenquelle { ScheitertBeiNetto = true, GegebeneElternfolge = new Elternfolge([new Elternzeile(HashP, ""), new Elternzeile(HashQ, HashP)]) };
        await using var server = await StarteServer(uebersicht, quelle, TestDiffquelle.Leer());
        using var client = new HttpClient();

        var liste = await client.GetAsync(new Uri(new Uri(server.Adresse), "api/zusammen"));
        var diff = await client.GetAsync(new Uri(new Uri(server.Adresse), "api/zusammen/diff?pfad=src%2Fa.txt"));

        Assert.That(liste.StatusCode, Is.EqualTo(HttpStatusCode.InternalServerError));
        Assert.That(diff.StatusCode, Is.EqualTo(HttpStatusCode.InternalServerError));
    }

    [Test]
    public async Task Wenn_der_Host_fremd_ist_dann_4xx_und_keine_CORS_Freigabe()
    {
        var quelle = LueckenlosQuelle();
        await using var server = await StarteServer(quelle: quelle);
        using var client = new HttpClient();
        using var anfrage = new HttpRequestMessage(HttpMethod.Get, new Uri(new Uri(server.Adresse), "api/zusammen"));
        anfrage.Headers.Host = "fremd.example";

        var fremd = await client.SendAsync(anfrage);
        var eigen = await client.GetAsync(new Uri(new Uri(server.Adresse), "api/zusammen"));

        Assert.That((int)fremd.StatusCode, Is.InRange(400, 499));
        Assert.That(eigen.Headers.Contains("Access-Control-Allow-Origin"), Is.False);
    }

    private static TestZusammenquelle LueckenlosQuelle()
    {
        return new TestZusammenquelle
        {
            GegebeneElternfolge = new Elternfolge([new Elternzeile(HashP, ""), new Elternzeile(HashQ, HashP)]),
            GegebeneNetto = new Dateiaenderungen([new Dateiaenderung("A", "src/a.txt", null, 4, 0)]),
            Patch = Patch,
        };
    }

    private static async Task<Webserver> StarteServer(TestUebersichtsquelle? uebersicht = null, TestZusammenquelle? quelle = null, TestDiffquelle? diffquelle = null)
    {
        var commits = new Commitzeilen([
            new Commitzeile(HashP, "Anna Beispiel", "2026-03-04T09:15:00+01:00", "Start", ""),
            new Commitzeile(HashQ, "Bernd Beispiel", "2026-03-05T18:30:00+01:00", "Dateien ändern", ""),
        ]);
        var gegeben = uebersicht ?? TestUebersichtsquelle.MitDateien(
            new Commitdateien(HashP, new Dateiaenderungen([new Dateiaenderung("A", "src/a.txt", null, 3, 0)])),
            new Commitdateien(HashQ, new Dateiaenderungen([new Dateiaenderung("M", "src/a.txt", null, 1, 0)])));
        var gegebenQuelle = quelle ?? new TestZusammenquelle
        {
            GegebeneElternfolge = new Elternfolge([new Elternzeile(HashP, ""), new Elternzeile(HashQ, HashP)]),
            GegebeneNetto = new Dateiaenderungen([new Dateiaenderung("A", "src/a.txt", null, 4, 0)]),
        };
        var protokoll = new StderrProtokoll(new StringWriter(), TimeProvider.System, Protokollstufe.Warnung);
        return await Webserver.StartenAsync(0, commits, TestDateiquelle.Leer(), diffquelle ?? TestDiffquelle.Leer(), gegeben, gegebenQuelle, Oberflaeche.AusDemProgramm(), protokoll);
    }
}
