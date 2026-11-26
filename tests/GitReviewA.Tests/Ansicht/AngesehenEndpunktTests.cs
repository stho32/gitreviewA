using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using GitReviewA.Ansicht;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Protokoll;
using GitReviewA.Server;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Ansicht;

/// <summary>
/// B4001: `GET` und `POST /api/angesehen` auf freiem Port — der Anfrageschutz wie bei den Haken (fremde Herkunft, nur POST,
/// nur application/json), die Grenze 200 Stellen, unbekannte Stellen und die unlesbare Übersicht (R00041, Kriterium 7).
/// </summary>
public class AngesehenEndpunktTests
{
    private const string HashA = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";

    [Test]
    public async Task Wenn_zwei_Stellen_gemeldet_werden_dann_200_und_GET_nennt_sie_in_fester_Reihenfolge()
    {
        await using var server = await StarteServer(TestUebersichtsquelle.Mit(HashA, "alt.txt", "src/b.txt"));
        using var client = new HttpClient();
        var koerper = $"{{\"stellen\":[{{\"commit\":\"{HashA}\",\"datei\":\"src/b.txt\"}},{{\"commit\":\"{HashA}\",\"datei\":\"alt.txt\"}}]}}";

        var antwort = await Sende(client, server, koerper);
        var stand = await Hole(client, server, host: null);

        Assert.That(antwort.Status, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(antwort.Text, Is.EqualTo("{\"angesehen\":2}"));
        Assert.That(stand.Status, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(stand.Text, Is.EqualTo(
            $"{{\"stellen\":[{{\"commit\":\"{HashA}\",\"datei\":\"alt.txt\"}},{{\"commit\":\"{HashA}\",\"datei\":\"src/b.txt\"}}],\"anzahl\":2}}"));
        Assert.That(stand.Koepfe, Has.None.StartsWith("Access-Control-"));
    }

    [Test]
    public async Task Wenn_der_Stand_noch_leer_ist_dann_200_mit_leerer_Liste()
    {
        await using var server = await StarteServer(TestUebersichtsquelle.Mit(HashA, "alt.txt"));
        using var client = new HttpClient();

        var stand = await Hole(client, server, host: null);

        Assert.That(stand.Status, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(stand.Text, Is.EqualTo("{\"stellen\":[],\"anzahl\":0}"));
    }

    [Test]
    public async Task Wenn_mehr_als_200_Stellen_kommen_dann_400_und_der_Stand_bleibt_die_Positivkontrolle_wirkt()
    {
        await using var server = await StarteServer(UebersichtMit(201));
        using var client = new HttpClient();

        var zuViel = await Sende(client, server, KoerperMitStellen(201));
        var standNachAbweisung = await Hole(client, server, host: null);
        var gueltig = await Sende(client, server, $"{{\"stellen\":[{{\"commit\":\"{HashA}\",\"datei\":\"datei-000.txt\"}}]}}");

        Assert.That(zuViel.Status, Is.EqualTo(HttpStatusCode.BadRequest));
        Assert.That(zuViel.Json.GetProperty("meldung").GetString(), Does.Contain("200"));
        Assert.That(standNachAbweisung.Text, Is.EqualTo("{\"stellen\":[],\"anzahl\":0}"));
        Assert.That(gueltig.Status, Is.EqualTo(HttpStatusCode.OK));
    }

    [Test]
    public async Task Wenn_eine_Stelle_unbekannt_ist_dann_400_und_keine_gemerkt()
    {
        await using var server = await StarteServer(TestUebersichtsquelle.Mit(HashA, "alt.txt"));
        using var client = new HttpClient();
        var koerper = $"{{\"stellen\":[{{\"commit\":\"{HashA}\",\"datei\":\"alt.txt\"}},{{\"commit\":\"{HashA}\",\"datei\":\"gibt-es-nicht.txt\"}}]}}";

        var antwort = await Sende(client, server, koerper);
        var stand = await Hole(client, server, host: null);

        Assert.That(antwort.Status, Is.EqualTo(HttpStatusCode.BadRequest));
        Assert.That(stand.Text, Is.EqualTo("{\"stellen\":[],\"anzahl\":0}"));
    }

    [TestCase("kein json")]
    [TestCase("")]
    [TestCase("null")]
    [TestCase("[]")]
    [TestCase("{}")]
    [TestCase("{\"stellen\":null}")]
    [TestCase("{\"stellen\":[]}")]
    [TestCase("{\"stellen\":[{\"datei\":\"alt.txt\"}]}")]
    [TestCase("{\"stellen\":[{\"commit\":\"" + HashA + "\"}]}")]
    [TestCase("{\"stellen\":[{\"commit\":\"" + HashA + "\",\"datei\":\"\"}]}")]
    [TestCase("{\"stellen\":[{\"commit\":\"" + HashA + "\",\"datei\":\"alt.txt\"}],\"stellen\":[]}")]
    public async Task Wenn_Koerper_oder_Stelle_unvollstaendig_dann_400_und_kein_Eintrag(string koerper)
    {
        await using var server = await StarteServer(TestUebersichtsquelle.Mit(HashA, "alt.txt"));
        using var client = new HttpClient();

        var antwort = await Sende(client, server, koerper);
        var stand = await Hole(client, server, host: null);

        Assert.That(antwort.Status, Is.EqualTo(HttpStatusCode.BadRequest));
        Assert.That(antwort.Json.GetProperty("meldung").GetString(), Is.Not.Empty);
        Assert.That(stand.Text, Is.EqualTo("{\"stellen\":[],\"anzahl\":0}"));
    }

    [TestCase("http://localhost:{port}", "application/json", HttpStatusCode.Forbidden)]
    [TestCase("http://evil.example", "application/json", HttpStatusCode.Forbidden)]
    [TestCase(null, "text/plain", HttpStatusCode.UnsupportedMediaType)]
    [TestCase(null, "application/x-www-form-urlencoded", HttpStatusCode.UnsupportedMediaType)]
    public async Task Wenn_fremde_Herkunft_oder_kein_JSON_dann_abgewiesen_und_kein_Eintrag(string? origin, string inhaltstyp, HttpStatusCode erwartet)
    {
        await using var server = await StarteServer(TestUebersichtsquelle.Mit(HashA, "alt.txt"));
        using var client = new HttpClient();
        var port = new Uri(server.Adresse).Port.ToString(System.Globalization.CultureInfo.InvariantCulture);

        var antwort = await Sende(client, server, Gueltig, origin: origin?.Replace("{port}", port), inhaltstyp: inhaltstyp);
        var stand = await Hole(client, server, host: null);

        Assert.That(antwort.Status, Is.EqualTo(erwartet));
        Assert.That(stand.Text, Is.EqualTo("{\"stellen\":[],\"anzahl\":0}"));
    }

    [Test]
    public async Task Wenn_mit_GET_der_Stand_abgerufen_wird_dann_200_und_kein_Eintrag()
    {
        await using var server = await StarteServer(TestUebersichtsquelle.Mit(HashA, "alt.txt"));
        using var client = new HttpClient();

        using var antwort = await client.GetAsync(new Uri(new Uri(server.Adresse), $"api/angesehen?stellen={HashA}"));

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(await antwort.Content.ReadAsStringAsync(), Is.EqualTo("{\"stellen\":[],\"anzahl\":0}"));
    }

    [TestCase("DELETE")]
    [TestCase("PUT")]
    public async Task Wenn_weder_POST_noch_GET_dann_405(string methode)
    {
        await using var server = await StarteServer(TestUebersichtsquelle.Mit(HashA, "alt.txt"));
        using var client = new HttpClient();
        using var anfrage = new HttpRequestMessage(new HttpMethod(methode), new Uri(new Uri(server.Adresse), "api/angesehen"));
        anfrage.Content = new StringContent(Gueltig, Encoding.UTF8, "application/json");

        using var antwort = await client.SendAsync(anfrage);

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.MethodNotAllowed));
    }

    [Test]
    public async Task Wenn_der_Host_fremd_ist_dann_403_und_keine_Namen()
    {
        await using var server = await StarteServer(TestUebersichtsquelle.Mit(HashA, "alt.txt"));
        using var client = new HttpClient();

        var antwort = await Hole(client, server, host: $"evil.example:{new Uri(server.Adresse).Port}");

        Assert.That(antwort.Status, Is.EqualTo(HttpStatusCode.Forbidden));
        Assert.That(antwort.Text, Does.Not.Contain("alt.txt"));
    }

    [Test]
    public async Task Wenn_die_Uebersicht_nicht_lesbar_ist_dann_antwortet_POST_500_und_der_Lauf_geht_weiter()
    {
        await using var server = await StarteServer(TestUebersichtsquelle.Scheiternd());
        using var client = new HttpClient();

        var antwort = await Sende(client, server, Gueltig);
        using var zustand = await client.GetAsync(new Uri(new Uri(server.Adresse), "api/zustand"));

        Assert.That(antwort.Status, Is.EqualTo(HttpStatusCode.InternalServerError));
        Assert.That(antwort.Json.GetProperty("meldung").GetString(), Is.Not.Empty);
        Assert.That(zustand.StatusCode, Is.EqualTo(HttpStatusCode.OK));
    }

    [TestCase("Markiert", 200)]
    [TestCase("Ungueltig", 400)]
    [TestCase("NichtLesbar", 500)]
    public void Wenn_der_Interactor_antwortet_dann_bildet_der_Adapter_den_Ausgang_auf_den_Statuscode_ab(string ausgang, int erwartet)
    {
        var antwort = AngesehenEndpunkt.AlsAntwort(new Angesehenergebnis(Enum.Parse<Angesehenausgang>(ausgang), 3, "Grund"));

        Assert.That(antwort.Statuscode, Is.EqualTo(erwartet));
    }

    private const string Gueltig = "{\"stellen\":[{\"commit\":\"a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4\",\"datei\":\"alt.txt\"}]}";

    private static TestUebersichtsquelle UebersichtMit(int anzahl)
    {
        var pfade = new string[anzahl];
        for (var nummer = 0; nummer < anzahl; nummer++)
        {
            pfade[nummer] = $"datei-{nummer:D3}.txt";
        }
        return TestUebersichtsquelle.Mit(HashA, pfade);
    }

    private static string KoerperMitStellen(int anzahl)
    {
        var stellen = new List<string>(anzahl);
        for (var nummer = 0; nummer < anzahl; nummer++)
        {
            stellen.Add($"{{\"commit\":\"{HashA}\",\"datei\":\"datei-{nummer:D3}.txt\"}}");
        }
        return $"{{\"stellen\":[{string.Join(",", stellen)}]}}";
    }

    private static async Task<Webserver> StarteServer(TestUebersichtsquelle quelle)
    {
        var commits = new Commitzeilen([new Commitzeile(HashA, "Testperson", "2026-01-01T09:00:00+00:00", "Erster Commit", "")]);
        var protokoll = new StderrProtokoll(new StringWriter(), TimeProvider.System, Protokollstufe.Warnung);
        return await Webserver.StartenAsync(0, commits, TestDateiquelle.Leer(), TestDiffquelle.Leer(), quelle, TestZusammenquelle.Leer(), Oberflaeche.AusDemProgramm(), protokoll);
    }

    private static async Task<(HttpStatusCode Status, string Text, JsonElement Json)> Sende(HttpClient client, Webserver server, string koerper, string? origin = null, string inhaltstyp = "application/json")
    {
        using var anfrage = new HttpRequestMessage(HttpMethod.Post, new Uri(new Uri(server.Adresse), "api/angesehen"));
        anfrage.Content = new StringContent(koerper, Encoding.UTF8);
        anfrage.Content.Headers.ContentType = new MediaTypeHeaderValue(inhaltstyp);
        if (origin is not null)
        {
            anfrage.Headers.Add("Origin", origin);
        }
        using var antwort = await client.SendAsync(anfrage);
        var text = await antwort.Content.ReadAsStringAsync();
        var json = default(JsonElement);
        if (text.Length > 0 && text.StartsWith('{'))
        {
            json = JsonDocument.Parse(text).RootElement.Clone();
        }
        return (antwort.StatusCode, text, json);
    }

    private static async Task<(HttpStatusCode Status, string Text, string[] Koepfe)> Hole(HttpClient client, Webserver server, string? host)
    {
        using var anfrage = new HttpRequestMessage(HttpMethod.Get, new Uri(new Uri(server.Adresse), "api/angesehen"));
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
