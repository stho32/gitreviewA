using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using GitReviewA.Aufruf;
using GitReviewA.Dateiansicht;
using GitReviewA.Git;
using GitReviewA.Protokoll;
using GitReviewA.Server;
using GitReviewA.Tests.Dateiansicht;

namespace GitReviewA.Tests.Server;

/// <summary>
/// R00043 Kriterien 10 und 19: nur die Nummer führt zum Inhalt, Review-Endpunkte sind in dieser Laufart 404, fremder Host und
/// fremde Herkunft werden abgewiesen (der Schutz aus #55 wird mitbenutzt), „Schließen“ ist POST mit Anfrageschutz.
/// </summary>
[NonParallelizable]
public class DateiansichtEndpunktTests
{
    private const string Inhalt = "INHALT-0\n";

    [TestCase("1")]
    [TestCase("-1")]
    [TestCase("01")]
    [TestCase("00")]
    [TestCase("0x0")]
    [TestCase("+0")]
    [TestCase("%200")]
    [TestCase("0.0")]
    [TestCase("%D9%A0")]
    [TestCase("%EF%BC%90")]
    [TestCase("2147483648")]
    [TestCase("4294967296")]
    [TestCase("99999999999999999999")]
    [TestCase("0/")]
    [TestCase("0/x")]
    [TestCase("..%2f..%2fetc%2fpasswd")]
    public async Task Wenn_die_Nummer_anders_geschrieben_wird_dann_400_oder_404_ohne_Inhalt(string nummer)
    {
        using var d = OrdnerD.Anlegen();
        File.WriteAllText(d.Pfad("inhalt.sql"), Inhalt);
        await using var server = await StarteServer(Stand(d.Pfad("inhalt.sql")), new StringWriter());
        using var client = new HttpClient();

        var antwort = await client.GetAsync(new Uri(new Uri(server.Adresse), $"api/dateiansicht/{nummer}"));
        var koerper = await antwort.Content.ReadAsStringAsync();

        Assert.That((int)antwort.StatusCode, Is.AnyOf(400, 404));
        Assert.That(koerper, Does.Not.Contain("INHALT-0"));
    }

    [TestCase("0")]
    [TestCase("%30")]
    [TestCase("0?pfad=/etc/passwd")]
    public async Task Wenn_die_Nummer_0_in_zulaessiger_Form_kommt_dann_der_eigene_Inhalt(string nummer)
    {
        using var d = OrdnerD.Anlegen();
        File.WriteAllText(d.Pfad("inhalt.sql"), Inhalt);
        await using var server = await StarteServer(Stand(d.Pfad("inhalt.sql")), new StringWriter());
        using var client = new HttpClient();

        var antwort = await client.GetAsync(new Uri(new Uri(server.Adresse), $"api/dateiansicht/{nummer}"));
        var koerper = await antwort.Content.ReadAsStringAsync();

        Assert.That((int)antwort.StatusCode, Is.EqualTo(200));
        using var dokument = JsonDocument.Parse(koerper);
        Assert.That(dokument.RootElement.GetProperty("text").GetString(), Is.EqualTo(Inhalt));
    }

    [Test]
    public async Task Wenn_die_Nummer_0_abgefragt_wird_dann_der_volle_Text()
    {
        using var d = OrdnerD.Anlegen();
        File.WriteAllText(d.Pfad("inhalt.sql"), Inhalt);
        await using var server = await StarteServer(Stand(d.Pfad("inhalt.sql")), new StringWriter());
        using var client = new HttpClient();

        var koerper = await client.GetStringAsync(new Uri(new Uri(server.Adresse), "api/dateiansicht/0"));

        using var dokument = JsonDocument.Parse(koerper);
        Assert.That(dokument.RootElement.GetProperty("text").GetString(), Is.EqualTo(Inhalt));
    }

    [Test]
    public async Task Wenn_die_Liste_abgefragt_wird_dann_Nummer_Anzeigename_echter_Pfad_Groesse_Zeilen_Kodierung_Zeilenende()
    {
        using var d = OrdnerD.Anlegen();
        await using var server = await StarteServer(Stand(d.Pfad("a.sql")), new StringWriter());
        using var client = new HttpClient();

        var koerper = await client.GetStringAsync(new Uri(new Uri(server.Adresse), "api/dateiansicht"));

        using var dokument = JsonDocument.Parse(koerper);
        var datei = dokument.RootElement.GetProperty("dateien").EnumerateArray().Single();
        Assert.That(datei.GetProperty("nummer").GetInt32(), Is.EqualTo(0));
        Assert.That(datei.GetProperty("anzeigename").GetString(), Is.EqualTo(d.Pfad("a.sql")));
        Assert.That(datei.GetProperty("echterPfad").GetString(), Is.EqualTo(d.Pfad("a.sql")));
        Assert.That(datei.GetProperty("groesse").GetInt32(), Is.EqualTo(36));
        Assert.That(datei.GetProperty("zeilen").GetInt32(), Is.EqualTo(3));
        Assert.That(datei.GetProperty("kodierung").GetString(), Is.EqualTo("UTF-8"));
        Assert.That(datei.GetProperty("zeilenende").GetString(), Is.EqualTo("LF"));
    }

    [TestCase("api/commits")]
    [TestCase("api/commits/c3d4e5f/dateien")]
    [TestCase("api/diff")]
    [TestCase("api/haken")]
    [TestCase("api/anmerkungen")]
    [TestCase("api/anmerkungen/0")]
    [TestCase("api/anmerkungen/0/loeschen")]
    [TestCase("api/ergebnis")]
    [TestCase("api/beenden")]
    [TestCase("api/zustand")]
    [TestCase("API/commits")]
    [TestCase("api/zustand/")]
    [TestCase("api/%2e%2e/api/zustand")]
    public async Task Wenn_ein_Review_Endpunkt_in_der_Dateiansicht_abgefragt_wird_dann_404_ohne_Zustand(string pfad)
    {
        using var d = OrdnerD.Anlegen();
        await using var server = await StarteServer(Stand(d.Pfad("a.sql")), new StringWriter());
        using var client = new HttpClient();

        var get = await client.GetAsync(new Uri(new Uri(server.Adresse), pfad));
        var post = await client.PostAsync(new Uri(new Uri(server.Adresse), pfad), new StringContent("{}", Encoding.UTF8, "application/json"));

        Assert.That((int)get.StatusCode, Is.EqualTo(404));
        Assert.That((int)post.StatusCode, Is.EqualTo(404));
        Assert.That(server.IstGeschlossen, Is.False);
    }

    [Test]
    public async Task Wenn_der_Host_fremd_ist_dann_403()
    {
        using var d = OrdnerD.Anlegen();
        await using var server = await StarteServer(Stand(d.Pfad("a.sql")), new StringWriter());
        using var client = new HttpClient();
        using var anfrage = new HttpRequestMessage(HttpMethod.Get, new Uri(new Uri(server.Adresse), "api/dateiansicht/0"));
        anfrage.Headers.Host = "fremd.example";

        var antwort = await client.SendAsync(anfrage);

        Assert.That((int)antwort.StatusCode, Is.EqualTo(403));
        Assert.That(await antwort.Content.ReadAsStringAsync(), Does.Not.Contain("SELECT"));
    }

    [TestCase("http://evil.example")]
    [TestCase("null")]
    public async Task Wenn_die_Herkunft_fremd_ist_dann_403_auf_GET_und_der_Lauf_lebt(string herkunft)
    {
        using var d = OrdnerD.Anlegen();
        await using var server = await StarteServer(Stand(d.Pfad("a.sql")), new StringWriter());
        using var client = new HttpClient();
        using var anfrage = new HttpRequestMessage(HttpMethod.Get, new Uri(new Uri(server.Adresse), "api/dateiansicht/0"));
        anfrage.Headers.TryAddWithoutValidation("Origin", herkunft);

        var antwort = await client.SendAsync(anfrage);

        Assert.That((int)antwort.StatusCode, Is.EqualTo(403));
        Assert.That(await antwort.Content.ReadAsStringAsync(), Does.Not.Contain("SELECT"));
        Assert.That(server.IstGeschlossen, Is.False);
    }

    [Test]
    public async Task Wenn_Schliessen_ohne_Anfrageschutz_kommt_dann_abgewiesen_und_der_Lauf_lebt()
    {
        using var d = OrdnerD.Anlegen();
        await using var server = await StarteServer(Stand(d.Pfad("a.sql")), new StringWriter());
        using var client = new HttpClient();

        using var fremd = new HttpRequestMessage(HttpMethod.Post, new Uri(new Uri(server.Adresse), "api/schliessen"));
        fremd.Headers.TryAddWithoutValidation("Origin", "http://evil.example");
        fremd.Content = new StringContent("{}", Encoding.UTF8, "application/json");
        var fremdeHerkunft = await client.SendAsync(fremd);

        using var falscherTyp = new HttpRequestMessage(HttpMethod.Post, new Uri(new Uri(server.Adresse), "api/schliessen"));
        falscherTyp.Content = new StringContent("{}", Encoding.UTF8, "text/plain");
        var falscherInhaltstyp = await client.SendAsync(falscherTyp);

        var get = await client.GetAsync(new Uri(new Uri(server.Adresse), "api/schliessen"));

        Assert.That((int)fremdeHerkunft.StatusCode, Is.EqualTo(403));
        Assert.That((int)falscherInhaltstyp.StatusCode, Is.EqualTo(415));
        Assert.That((int)get.StatusCode, Is.EqualTo(405));
        Assert.That(server.IstGeschlossen, Is.False);
    }

    [Test]
    public async Task Wenn_Schliessen_richtig_kommt_dann_200_und_der_Lauf_ist_geschlossen()
    {
        using var d = OrdnerD.Anlegen();
        await using var server = await StarteServer(Stand(d.Pfad("a.sql")), new StringWriter());
        using var client = new HttpClient();

        var antwort = await client.PostAsync(new Uri(new Uri(server.Adresse), "api/schliessen"), new StringContent("{}", Encoding.UTF8, "application/json"));

        Assert.That((int)antwort.StatusCode, Is.EqualTo(200));
        Assert.That(await antwort.Content.ReadAsStringAsync(), Does.Contain("Dateiansicht geschlossen"));
        Assert.That(server.IstGeschlossen, Is.True);
    }

    [Test]
    public async Task Wenn_die_Antworten_kommen_dann_mit_Schutzkoepfen_ohne_CORS()
    {
        using var d = OrdnerD.Anlegen();
        await using var server = await StarteServer(Stand(d.Pfad("a.sql")), new StringWriter());
        using var client = new HttpClient();

        var liste = await client.GetAsync(new Uri(new Uri(server.Adresse), "api/dateiansicht"));
        var seite = await client.GetAsync(server.Adresse);

        Assert.That(liste.Content.Headers.ContentType?.MediaType, Is.EqualTo("application/json"));
        Assert.That(liste.Headers.GetValues("X-Content-Type-Options").Single(), Is.EqualTo("nosniff"));
        Assert.That(liste.Headers.GetValues("Content-Security-Policy").Single(), Does.Contain("frame-ancestors 'none'"));
        Assert.That(liste.Headers.CacheControl?.NoStore, Is.True);
        Assert.That(liste.Headers.Contains("Access-Control-Allow-Origin"), Is.False);
        Assert.That(seite.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(seite.Content.Headers.ContentType?.MediaType, Is.EqualTo("text/html"));
    }

    [Test]
    public async Task Wenn_der_Inhalt_nur_Steuerzeichen_traegt_dann_bleibt_die_Antwort_unter_sechsmal_der_Dateigroesse_plus_1_KiB()
    {
        using var d = OrdnerD.Anlegen();
        var inhalt = new byte[1024 * 1024];
        Array.Fill(inhalt, (byte)0x01);
        File.WriteAllBytes(d.Pfad("steuer.sql"), inhalt);
        await using var server = await StarteServer(Stand(d.Pfad("steuer.sql")), new StringWriter());
        using var client = new HttpClient();

        var antwort = await client.GetByteArrayAsync(new Uri(new Uri(server.Adresse), "api/dateiansicht/0"));

        Assert.That(antwort.LongLength, Is.LessThanOrEqualTo(6L * inhalt.Length + 1024));
        using var dokument = JsonDocument.Parse(antwort);
        Assert.That(dokument.RootElement.GetProperty("text").GetString()?.Length, Is.EqualTo(inhalt.Length));
    }

    private static Dateiansichtsstand Stand(string pfad)
    {
        var buchung = new Quellenbuchung();
        var ausgang = new DateiansichtStartInteractor(new DateiLeser(buchung), new GitCommitDateiquelle(Environment.CurrentDirectory, buchung))
            .Starte(new Dateiaufruf([pfad], 0, BrowserOeffnen: false, Protokollstufe.Warnung));
        return ausgang.Stand ?? throw new InvalidOperationException(ausgang.Fehler[0].Grund.Art.ToString());
    }

    private static async Task<DateiansichtServer> StarteServer(Dateiansichtsstand stand, StringWriter ziel)
    {
        var protokoll = new StderrProtokoll(ziel, TimeProvider.System, Protokollstufe.Warnung);
        return await DateiansichtServer.StarteAsync(stand, 0, Oberflaeche.AusDemProgramm(), protokoll);
    }
}