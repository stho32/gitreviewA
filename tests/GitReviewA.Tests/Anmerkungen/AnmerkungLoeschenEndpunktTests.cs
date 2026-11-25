using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using GitReviewA.Anmerkungen;
using GitReviewA.Git;
using GitReviewA.Protokoll;
using GitReviewA.Server;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Anmerkungen;

/// <summary>
/// R00019, Kriterien 1, 5, 6 und 8 am Endpunkt: `POST /api/anmerkungen/{nummer}/loeschen` mit 200, 404 und 409, dahinter der
/// unveränderte Anfrageschutz und die Host-Prüfung; der Weg ist vom Ändern (I0023) getrennt. Was der Interactor entscheidet, prüft
/// <c>Akzeptanz/AnmerkungLoeschenTests</c>.
/// </summary>
public class AnmerkungLoeschenEndpunktTests
{
    private const string HashA = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";
    private const string Anlegen = "{\"commit\":\"" + HashA + "\",\"datei\":\"lang.txt\",\"zeile\":18,\"text\":\"Klammer fehlt\"}";

    [TestCase("")]
    [TestCase("{}")]
    public async Task Wenn_geloescht_dann_200_mit_Nummer_und_GET_nennt_sie_nicht_mehr(string koerper)
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();
        await Sende(client, server, "api/anmerkungen", Anlegen);

        var antwort = await Loesche(client, server, 1, koerper);
        var liste = await Hole(client, server);

        Assert.That(antwort.Status, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(antwort.Text, Is.EqualTo("{\"nummer\":1}"));
        Assert.That(liste, Is.EqualTo("[]"));
        Assert.That(server.Anmerkungen.Schnappschuss().Anzahl, Is.Zero);
    }

    [TestCase("7")]
    [TestCase("sieben")]
    [TestCase("0")]
    public async Task Wenn_die_Nummer_unbekannt_oder_keine_Zahl_dann_404_und_die_Liste_bleibt(string nummer)
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();
        await Sende(client, server, "api/anmerkungen", Anlegen);

        var antwort = await Loesche(client, server, nummer, "{}");
        var liste = await Hole(client, server);

        Assert.That(antwort.Status, Is.EqualTo(HttpStatusCode.NotFound));
        Assert.That(antwort.Json.GetProperty("meldung").GetString(), Is.Not.Empty);
        Assert.That(liste, Does.Contain("\"text\":\"Klammer fehlt\""));
        Assert.That(server.Anmerkungen.Schnappschuss().Anzahl, Is.EqualTo(1));
    }

    [Test]
    public async Task Wenn_der_Lauf_beendet_ist_dann_409_und_nichts_geloescht()
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();
        await Sende(client, server, "api/anmerkungen", Anlegen);
        server.Anmerkungen.VersucheAbzuschliessen();

        var antwort = await Loesche(client, server, 1, "{}");

        Assert.That(antwort.Status, Is.EqualTo(HttpStatusCode.Conflict));
        Assert.That(antwort.Json.GetProperty("meldung").GetString(), Is.EqualTo("Review ist beendet — keine Anmerkung mehr möglich"));
        Assert.That(server.Anmerkungen.Schnappschuss().Anzahl, Is.EqualTo(1));
    }

    [Test]
    [Description("R00019 Kriterium 8 — der Löschweg prüft die Sperre der Stelle nicht (fail-open), auch nicht über eine feste Übersicht")]
    public async Task Wenn_die_Stelle_laut_Uebersicht_gesperrt_ist_dann_wird_sie_trotzdem_geloescht()
    {
        await using var server = await StarteServer(TestUebersichtsquelle.MitSperre(HashA, "f.txt", "Diff nicht lesbar: Name nicht eindeutig", "g.txt"));
        using var client = new HttpClient();
        server.Anmerkungen.VersucheAnzuhaengen(new GepruefteAnmerkung(HashA, "f.txt", 1, "gesperrt"), out _);

        var antwort = await Loesche(client, server, 1, "{}");

        Assert.That(antwort.Status, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(server.Anmerkungen.Schnappschuss().Anzahl, Is.Zero);
    }

    [Test]
    public async Task Wenn_der_Loeschweg_und_der_Aenderweg_getrennt_sind_dann_wirkt_der_Nummernpfad_als_Aenderung()
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();
        await Sende(client, server, "api/anmerkungen", Anlegen);

        var geaendert = await Sende(client, server, "api/anmerkungen/1", "{\"text\":\"neu\"}");
        var geloescht = await Loesche(client, server, 1, "{}");

        Assert.That((geaendert.Status, geloescht.Status), Is.EqualTo((HttpStatusCode.OK, HttpStatusCode.OK)));
        Assert.That(server.Anmerkungen.Schnappschuss().Anzahl, Is.Zero);
    }

    [TestCase("api/anmerkungen/1/loeschen")]
    [TestCase("api/anmerkungen/01/loeschen")]
    public async Task Wenn_fremder_Origin_auch_bei_Pfadvariante_dann_403_und_nichts_geloescht(string pfad)
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();
        await Sende(client, server, "api/anmerkungen", Anlegen);

        var antwort = await Sende(client, server, pfad, "{}", origin: "http://evil.example");

        Assert.That(antwort.Status, Is.EqualTo(HttpStatusCode.Forbidden));
        Assert.That(server.Anmerkungen.Schnappschuss().Anzahl, Is.EqualTo(1));
    }

    [TestCase("localhost")]
    [TestCase("evil.example")]
    public async Task Wenn_fremder_Host_dann_403_und_nichts_geloescht(string host)
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();
        await Sende(client, server, "api/anmerkungen", Anlegen);

        var antwort = await Sende(client, server, "api/anmerkungen/1/loeschen", "{}", host: $"{host}:{new Uri(server.Adresse).Port}");

        Assert.That(antwort.Status, Is.EqualTo(HttpStatusCode.Forbidden));
        Assert.That(server.Anmerkungen.Schnappschuss().Anzahl, Is.EqualTo(1));
    }

    [Test]
    public async Task Wenn_eigener_Origin_und_kein_Origin_dann_200()
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();
        await Sende(client, server, "api/anmerkungen", Anlegen);
        await Sende(client, server, "api/anmerkungen", Anlegen);

        var eigener = await Sende(client, server, "api/anmerkungen/1/loeschen", "{}", origin: server.Adresse.TrimEnd('/'));
        var ohne = await Sende(client, server, "api/anmerkungen/2/loeschen", "{}");

        Assert.That((eigener.Status, ohne.Status), Is.EqualTo((HttpStatusCode.OK, HttpStatusCode.OK)));
    }

    [TestCase("text/plain")]
    [TestCase("application/x-www-form-urlencoded")]
    public async Task Wenn_Inhaltstyp_nicht_JSON_dann_415_und_nichts_geloescht(string inhaltstyp)
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();
        await Sende(client, server, "api/anmerkungen", Anlegen);

        var antwort = await Sende(client, server, "api/anmerkungen/1/loeschen", "{}", inhaltstyp: inhaltstyp);

        Assert.That(antwort.Status, Is.EqualTo(HttpStatusCode.UnsupportedMediaType));
        Assert.That(server.Anmerkungen.Schnappschuss().Anzahl, Is.EqualTo(1));
    }

    [TestCase("GET")]
    [TestCase("PUT")]
    [TestCase("DELETE")]
    public async Task Wenn_die_Methode_nicht_POST_ist_dann_405_mit_Allow_POST_und_nichts_geloescht(string methode)
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();
        await Sende(client, server, "api/anmerkungen", Anlegen);
        using var anfrage = new HttpRequestMessage(new HttpMethod(methode), new Uri(new Uri(server.Adresse), "api/anmerkungen/1/loeschen"));

        using var antwort = await client.SendAsync(anfrage);

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.MethodNotAllowed));
        Assert.That(antwort.Content.Headers.Allow, Is.EqualTo(new[] { "POST" }));
        Assert.That(server.Anmerkungen.Schnappschuss().Anzahl, Is.EqualTo(1));
    }

    [Test]
    public async Task Wenn_CORS_Vorabanfrage_fremder_Seite_dann_403_ohne_CORS_Freigabe()
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();
        using var anfrage = new HttpRequestMessage(HttpMethod.Options, new Uri(new Uri(server.Adresse), "api/anmerkungen/1/loeschen"));
        anfrage.Headers.Add("Origin", "http://localhost:9999");
        anfrage.Headers.Add("Access-Control-Request-Method", "POST");
        anfrage.Headers.Add("Access-Control-Request-Headers", "content-type");

        using var antwort = await client.SendAsync(anfrage);

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.Forbidden));
        Assert.That(antwort.Headers.Select(kopf => kopf.Key), Has.None.StartsWith("Access-Control-"));
    }

    [Test]
    public async Task Wenn_der_Sammelpfad_bleibt_dann_GET_200_ohne_CORS_Kopf_und_POST_201_unveraendert()
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();

        var angelegt = await Sende(client, server, "api/anmerkungen", Anlegen);
        var liste = await Hole(client, server);
        var kopfzeilen = await Koepfe(client, server);

        Assert.That((angelegt.Status, angelegt.Json.GetProperty("nummer").GetInt32()), Is.EqualTo((HttpStatusCode.Created, 1)));
        Assert.That(liste, Does.Contain("\"nummer\":1"));
        Assert.That(kopfzeilen, Has.None.StartsWith("Access-Control-"));
    }

    private static Task<Webserver> StarteServer()
    {
        return StarteServer(TestUebersichtsquelle.Leer());
    }

    private static async Task<Webserver> StarteServer(TestUebersichtsquelle quelle)
    {
        var commits = new Commitzeilen([new Commitzeile(HashA, "Testperson", "2026-01-01T09:00:00+00:00", "Erster Commit", "")]);
        var protokoll = new StderrProtokoll(new StringWriter(), TimeProvider.System, Protokollstufe.Warnung);
        return await Webserver.StartenAsync(0, commits, TestDateiquelle.Leer(), TestDiffquelle.Leer(), quelle, TestZusammenquelle.Leer(), Oberflaeche.AusDemProgramm(), protokoll);
    }

    private static Task<(HttpStatusCode Status, string Text, JsonElement Json)> Loesche(HttpClient client, Webserver server, int nummer, string koerper)
    {
        return Loesche(client, server, nummer.ToString(), koerper);
    }

    private static Task<(HttpStatusCode Status, string Text, JsonElement Json)> Loesche(HttpClient client, Webserver server, string nummer, string koerper)
    {
        return Sende(client, server, $"api/anmerkungen/{nummer}/loeschen", koerper);
    }

    private static async Task<(HttpStatusCode Status, string Text, JsonElement Json)> Sende(HttpClient client, Webserver server, string pfad, string koerper, string? origin = null, string? host = null, string inhaltstyp = "application/json")
    {
        using var anfrage = new HttpRequestMessage(HttpMethod.Post, new Uri(new Uri(server.Adresse), pfad));
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
        return (antwort.StatusCode, text, json);
    }

    private static async Task<string> Hole(HttpClient client, Webserver server)
    {
        using var antwort = await client.GetAsync(new Uri(new Uri(server.Adresse), "api/anmerkungen"));
        return await antwort.Content.ReadAsStringAsync();
    }

    private static async Task<string[]> Koepfe(HttpClient client, Webserver server)
    {
        using var antwort = await client.GetAsync(new Uri(new Uri(server.Adresse), "api/anmerkungen"));
        return antwort.Headers.Concat(antwort.Content.Headers).Select(kopf => kopf.Key).ToArray();
    }
}
