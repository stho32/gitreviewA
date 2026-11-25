using System.Net;
using System.Text;
using GitReviewA.Aufruf;
using GitReviewA.Bild;
using GitReviewA.Diff;
using GitReviewA.Git;
using GitReviewA.Protokoll;
using GitReviewA.Server;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Bild;

/// <summary>B2306: der Endpunkt `GET /api/commits/{hash}/bild` gegen die feste Seite, den Content-Type und die Abweisungen.</summary>
internal sealed class BildEndpunktTests
{
    private const string HashP = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";
    private const string HashQ = "c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6";

    private static readonly byte[] Png1 = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x01, 0x02];
    private static readonly byte[] Png2 = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x03, 0x04];

    [Test]
    public async Task Wenn_vorher_und_nachher_dann_200_mit_Bild_Content_Type_und_nosniff()
    {
        var quelle = new TestBildquelle().Mit("bilder/logo.png", Bildseite.Nachher, Png2).Mit("bilder/logo.png", Bildseite.Vorher, Png1);
        await using var server = await StarteServer(quelle);
        using var client = new HttpClient();

        var vorher = await client.GetAsync(Adresse(server, HashQ, "bilder/logo.png", "vorher"));
        var nachher = await client.GetAsync(Adresse(server, HashQ, "bilder/logo.png", "nachher"));

        Assert.That(vorher.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(nachher.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(nachher.Content.Headers.ContentType!.MediaType, Is.EqualTo("image/png"));
        Assert.That(nachher.Headers.GetValues("X-Content-Type-Options"), Is.EqualTo(new[] { "nosniff" }));
        Assert.That(nachher.Content.Headers.ContentLength, Is.EqualTo(Png2.Length));
        Assert.That(await vorher.Content.ReadAsByteArrayAsync(), Is.EqualTo(Png1));
        Assert.That(await nachher.Content.ReadAsByteArrayAsync(), Is.EqualTo(Png2));
        Assert.That(quelle.Lesevorgaenge, Is.EqualTo(2));
    }

    [TestCase("bilder/logo.png", "image/png", "89504E470D0A1A0A")]
    [TestCase("bilder/foto.jpg", "image/jpeg", "FFD8FFE0")]
    [TestCase("bilder/bunt.gif", "image/gif", "474946383961")]
    [TestCase("bilder/klein.webp", "image/webp", "524946460000000057454250")]
    public async Task Wenn_ein_fester_Typ_dann_sein_Content_Type(string pfad, string medientyp, string bytesHex)
    {
        var bytes = Convert.FromHexString(bytesHex);
        var quelle = new TestBildquelle().Mit(pfad, Bildseite.Nachher, bytes);
        await using var server = await StarteServer(quelle);
        using var client = new HttpClient();

        var antwort = await client.GetAsync(Adresse(server, HashQ, pfad, "nachher"));

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(antwort.Content.Headers.ContentType!.MediaType, Is.EqualTo(medientyp));
    }

    [TestCase("")]
    [TestCase("&seite=unten")]
    [TestCase("&seite=")]
    [TestCase("&seite=NACHHER")]
    [TestCase("&seite=nachher&seite=nachher")]
    public async Task Wenn_Seite_fehlt_oder_unbekannt_dann_400_ohne_Lesevorgang(string zusatz)
    {
        var quelle = new TestBildquelle();
        await using var server = await StarteServer(quelle);
        using var client = new HttpClient();

        var antwort = await client.GetAsync(new Uri(new Uri(server.Adresse), $"api/commits/{HashQ}/bild?pfad=bilder%2Flogo.png{zusatz}"));

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
        Assert.That(quelle.Lesevorgaenge, Is.Zero);
    }

    [TestCase(HashP, "bilder/logo.png")]
    [TestCase("c3d4e5f", "bilder/logo.png")]
    [TestCase("HEAD", "bilder/logo.png")]
    [TestCase(HashQ, "bilder/gibt-es-nicht.png")]
    [TestCase(HashQ, "notizen2.txt")]
    public async Task Wenn_Hash_oder_Pfad_abgewiesen_dann_404_ohne_Bild_Lesevorgang(string hash, string pfad)
    {
        var quelle = new TestBildquelle().Mit("bilder/logo.png", Bildseite.Nachher, Png1);
        await using var server = await StarteServer(quelle, nurQ: true);
        using var client = new HttpClient();

        var antwort = await client.GetAsync(Adresse(server, hash, pfad, "nachher"));

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
        Assert.That(quelle.Lesevorgaenge, Is.Zero);
    }

    [Test]
    public async Task Wenn_Textdatei_oder_fehlende_Seite_dann_404_ohne_Bild_Lesevorgang()
    {
        var quelle = new TestBildquelle().Mit("bilder/logo.png", Bildseite.Nachher, Png1);
        await using var server = await StarteServer(quelle);
        using var client = new HttpClient();

        var text = await client.GetAsync(Adresse(server, HashQ, "notizen2.txt", "nachher"));
        var neueVorher = await client.GetAsync(Adresse(server, HashQ, "bilder/neu.png", "vorher"));
        var geloeschteNachher = await client.GetAsync(Adresse(server, HashQ, "bilder/weg.png", "nachher"));

        Assert.That(text.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
        Assert.That(neueVorher.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
        Assert.That(geloeschteNachher.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
        Assert.That(quelle.Lesevorgaenge, Is.Zero);
    }

    [Test]
    public async Task Wenn_ueber_der_Grenze_dann_413_mit_der_Grenze()
    {
        var quelle = new TestBildquelle().ZuGrossFuer("bilder/logo.png", 4096);
        await using var server = await StarteServer(quelle);
        using var client = new HttpClient();

        var antwort = await client.GetAsync(Adresse(server, HashQ, "bilder/logo.png", "nachher"));
        var json = await antwort.Content.ReadAsStringAsync();
        var meldung = System.Text.Json.JsonDocument.Parse(json).RootElement.GetProperty("meldung").GetString();

        Assert.That(antwort.StatusCode, Is.EqualTo((HttpStatusCode)413));
        Assert.That(meldung, Does.Contain("zu groß").And.Contain("4096"));
    }

    [Test]
    public async Task Wenn_nicht_lesbar_dann_500_mit_Meldung()
    {
        var quelle = new TestBildquelle().ScheitertFuer("bilder/logo.png");
        await using var server = await StarteServer(quelle);
        using var client = new HttpClient();

        var antwort = await client.GetAsync(Adresse(server, HashQ, "bilder/logo.png", "nachher"));
        var json = await antwort.Content.ReadAsStringAsync();

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.InternalServerError));
        Assert.That(json, Is.EqualTo("""{"meldung":"Bild konnte nicht gelesen werden"}"""));
    }

    [Test]
    public async Task Wenn_mehrere_bild_und_abgewiesene_Anfragen_dann_Dateiliste_nur_einmal_gelesen()
    {
        var dateien = new TestDateiquelle(new() { [HashQ] = DateienVonQ() });
        var quelle = new TestBildquelle().Mit("bilder/logo.png", Bildseite.Nachher, Png1);
        await using var server = await StarteServer(quelle, dateien);
        using var client = new HttpClient();

        await client.GetAsync(Adresse(server, HashQ, "bilder/logo.png", "nachher"));
        await client.GetAsync(Adresse(server, HashQ, "bilder/logo.png", "nachher"));
        await client.GetAsync(Adresse(server, HashQ, "bilder/gibt-es-nicht.png", "nachher"));
        await client.GetAsync(Adresse(server, HashQ, "notizen2.txt", "nachher"));

        Assert.That(dateien.Lesevorgaenge, Is.EqualTo(1), "die Dateiliste wird gemerkt");
        Assert.That(quelle.Lesevorgaenge, Is.EqualTo(2), "nur die zwei Anfragen mit Bild");
    }

    private static Dateiaenderungen DateienVonQ()
    {
        return new Dateiaenderungen([
            new Dateiaenderung("M", "bilder/logo.png", null, null, null),
            new Dateiaenderung("M", "bilder/foto.jpg", null, null, null),
            new Dateiaenderung("M", "bilder/bunt.gif", null, null, null),
            new Dateiaenderung("M", "bilder/klein.webp", null, null, null),
            new Dateiaenderung("M", "notizen2.txt", "notizen.txt", 1, 1),
            new Dateiaenderung("A", "bilder/neu.png", null, null, null),
            new Dateiaenderung("D", "bilder/weg.png", null, null, null),
            new Dateiaenderung("R", "bilder/umbenannt.png", "bilder/alt.png", 0, 0),
        ]);
    }

    private static Uri Adresse(Webserver server, string hash, string pfad, string seite)
    {
        return new Uri(new Uri(server.Adresse), $"api/commits/{Uri.EscapeDataString(hash)}/bild?pfad={Uri.EscapeDataString(pfad)}&seite={Uri.EscapeDataString(seite)}");
    }

    private static async Task<Webserver> StarteServer(TestBildquelle quelle, TestDateiquelle? dateien = null, bool nurQ = false)
    {
        var quellen = dateien ?? new TestDateiquelle(new() { [HashQ] = DateienVonQ() });
        var commitP = new Commitzeile(HashP, "Anna Beispiel", "2026-03-04T09:15:00+01:00", "Start", "");
        var commitQ = new Commitzeile(HashQ, "Bernd Beispiel", "2026-03-05T18:30:00+01:00", "Bilder ändern", "");
        var commits = nurQ ? new Commitzeilen([commitQ]) : new Commitzeilen([commitP, commitQ]);
        var protokoll = new StderrProtokoll(new StringWriter(), TimeProvider.System, Protokollstufe.Warnung);
        return await Webserver.StartenAsync(0, commits, quellen, TestDiffquelle.Leer(), TestUebersichtsquelle.Leer(), TestZusammenquelle.Leer(), Oberflaeche.AusDemProgramm(), protokoll, bildquelle: quelle);
    }
}
