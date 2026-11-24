using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using GitReviewA.Git;
using GitReviewA.Protokoll;
using GitReviewA.Server;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Anmerkungen;

public class AnmerkungsEndpunktTests
{
    private const string HashA = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";
    private const string Gueltig = "{\"commit\":\"" + HashA + "\",\"datei\":\"src/Foo.cs\",\"zeile\":42,\"text\":\"Null-Prüfung fehlt\"}";

    [Test]
    public async Task Wenn_zwei_gueltige_Anmerkungen_dann_201_mit_Nummer_1_und_2_und_im_Speicher()
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();

        var erste = await Sende(client, server, "api/anmerkungen", Gueltig);
        var zweite = await Sende(client, server, "api/anmerkungen", "{\"commit\":\"" + HashA + "\",\"datei\":\"README.md\",\"text\":\"veraltet\"}");

        Assert.That((erste.Status, erste.Json.GetProperty("nummer").GetInt32()), Is.EqualTo((HttpStatusCode.Created, 1)));
        Assert.That((zweite.Status, zweite.Json.GetProperty("nummer").GetInt32()), Is.EqualTo((HttpStatusCode.Created, 2)));
        var gespeichert = server.Anmerkungen.Schnappschuss().AlsArray();
        Assert.That(gespeichert.Select(a => (a.Nummer, a.Datei, a.Zeile, a.Text)), Is.EqualTo(new[] { (1, "src/Foo.cs", (int?)42, "Null-Prüfung fehlt"), (2, "README.md", (int?)null, "veraltet") }));
    }

    [Test]
    [Description("R00014 Kriterium 6")]
    public async Task Wenn_eine_Anmerkung_an_eine_gesperrte_Stelle_gesendet_dann_400_mit_Sperrgrund_und_die_naechste_bekommt_Nummer_1()
    {
        await using var server = await StarteServer(TestUebersichtsquelle.MitSperre(HashA, "f.txt", "Diff nicht lesbar: Name nicht eindeutig", "g.txt"));
        using var client = new HttpClient();

        var gesperrt = await Sende(client, server, "api/anmerkungen", "{\"commit\":\"" + HashA + "\",\"datei\":\"f.txt\",\"zeile\":1,\"text\":\"t\"}");
        var lesbar = await Sende(client, server, "api/anmerkungen", "{\"commit\":\"" + HashA + "\",\"datei\":\"g.txt\",\"zeile\":1,\"text\":\"t\"}");

        Assert.That(gesperrt.Status, Is.EqualTo(HttpStatusCode.BadRequest));
        Assert.That(gesperrt.Json.GetProperty("meldung").GetString(), Is.EqualTo("Diff nicht lesbar: Name nicht eindeutig"));
        Assert.That((lesbar.Status, lesbar.Json.GetProperty("nummer").GetInt32()), Is.EqualTo((HttpStatusCode.Created, 1)));
        Assert.That(server.Anmerkungen.Schnappschuss().Anzahl, Is.EqualTo(1));
    }

    [Test]
    [Description("R00014 Kriterium 6 — Nacharbeit Karte 29: Sperre und Ergebnis vergleichen denselben kanonischen Namen")]
    public async Task Wenn_die_Anmerkung_die_Markenform_des_gesperrten_Namens_traegt_dann_400_mit_Sperrgrund_und_keine_Nummer()
    {
        await using var server = await StarteServer(TestUebersichtsquelle.MitSperre(HashA, "z\n⟨0xFF⟩.txt", "Diff nicht lesbar: Name nicht übergebbar", "a⟨0xFF⟩.sh"));
        using var client = new HttpClient();

        var gesperrt = await Sende(client, server, "api/anmerkungen", "{\"commit\":\"" + HashA + "\",\"datei\":\"z⟨U+000A⟩⟨0xFF⟩.txt\",\"zeile\":1,\"text\":\"x\"}");
        var lesbar = await Sende(client, server, "api/anmerkungen", "{\"commit\":\"" + HashA + "\",\"datei\":\"a⟨0xFF⟩.sh\",\"zeile\":1,\"text\":\"x\"}");

        Assert.That((gesperrt.Status, gesperrt.Json.GetProperty("meldung").GetString()), Is.EqualTo((HttpStatusCode.BadRequest, "Diff nicht lesbar: Name nicht übergebbar")));
        Assert.That((lesbar.Status, lesbar.Json.GetProperty("nummer").GetInt32()), Is.EqualTo((HttpStatusCode.Created, 1)));
        Assert.That(server.Anmerkungen.Schnappschuss().Anzahl, Is.EqualTo(1), "nichts gespeichert, keine Nummer verbraucht");
    }

    [TestCase("kein json")]
    [TestCase("")]
    [TestCase("null")]
    [TestCase("[]")]
    [TestCase("42")]
    [TestCase("{\"commit\":\"" + HashA + "\",\"datei\":\"a\",\"zeile\":1.5,\"text\":\"t\"}")]
    [TestCase("{\"commit\":\"" + HashA + "\",\"datei\":\"a\",\"zeile\":1,\"text\":\"t\"} {}")]
    [TestCase("{\"commit\":\"" + HashA + "\",\"datei\":\"a\",\"zeile\":1,\"text\":\"t\",\"text\":\"zweiter\"}")]
    [TestCase("{\"commit\":\"" + HashA + "\",\"datei\":\"a\",\"zeile\":0,\"text\":\"t\"}")]
    [TestCase("{\"commit\":\"a1b2c3d\",\"datei\":\"a\",\"zeile\":1,\"text\":\"t\"}")]
    public async Task Wenn_Koerper_ungueltig_dann_400_mit_Meldung_und_nichts_gespeichert(string koerper)
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();

        var antwort = await Sende(client, server, "api/anmerkungen", koerper);

        Assert.That(antwort.Status, Is.EqualTo(HttpStatusCode.BadRequest));
        Assert.That(antwort.Json.GetProperty("meldung").GetString(), Is.Not.Empty);
        Assert.That(server.Anmerkungen.Schnappschuss().Anzahl, Is.Zero);
    }

    [Test]
    public async Task Wenn_Datei_4097_Zeichen_dann_400_mit_Meldung_und_nichts_gespeichert()
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();
        var koerper = "{\"commit\":\"" + HashA + "\",\"datei\":\"" + new string('d', 4097) + "\",\"zeile\":1,\"text\":\"t\"}";

        var antwort = await Sende(client, server, "api/anmerkungen", koerper);

        Assert.That(antwort.Status, Is.EqualTo(HttpStatusCode.BadRequest));
        Assert.That(antwort.Json.GetProperty("meldung").GetString(), Does.Contain("4096"));
        Assert.That(server.Anmerkungen.Schnappschuss().Anzahl, Is.Zero);
    }

    [Test]
    public async Task Wenn_Review_beendet_dann_409_und_nicht_gespeichert()
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();
        server.Anmerkungen.VersucheAbzuschliessen();

        var antwort = await Sende(client, server, "api/anmerkungen", Gueltig);

        Assert.That(antwort.Status, Is.EqualTo(HttpStatusCode.Conflict));
        Assert.That(server.Anmerkungen.Schnappschuss().Anzahl, Is.Zero);
    }

    [TestCase("api/anmerkungen")]
    [TestCase("api/anmerkungen/")]
    [TestCase("API/Anmerkungen")]
    public async Task Wenn_fremder_Origin_auch_bei_Pfadvariante_dann_403_und_nichts_gespeichert(string pfad)
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();

        var antwort = await Sende(client, server, pfad, Gueltig, origin: "http://evil.example");

        Assert.That(antwort.Status, Is.EqualTo(HttpStatusCode.Forbidden));
        Assert.That(server.Anmerkungen.Schnappschuss().Anzahl, Is.Zero);
    }

    [TestCase("evil.example")]
    [TestCase("localhost")]
    public async Task Wenn_fremder_Host_dann_403_und_nichts_gespeichert(string host)
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();

        var antwort = await Sende(client, server, "api/anmerkungen", Gueltig, host: $"{host}:{new Uri(server.Adresse).Port}");

        Assert.That(antwort.Status, Is.EqualTo(HttpStatusCode.Forbidden));
        Assert.That(server.Anmerkungen.Schnappschuss().Anzahl, Is.Zero);
    }

    [Test]
    public async Task Wenn_eigener_Origin_dann_201()
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();

        var antwort = await Sende(client, server, "api/anmerkungen", Gueltig, origin: server.Adresse.TrimEnd('/'));

        Assert.That(antwort.Status, Is.EqualTo(HttpStatusCode.Created));
    }

    [TestCase("text/plain")]
    [TestCase("application/x-www-form-urlencoded")]
    public async Task Wenn_Inhaltstyp_nicht_JSON_dann_415_und_nichts_gespeichert(string inhaltstyp)
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();

        var antwort = await Sende(client, server, "api/anmerkungen", Gueltig, inhaltstyp: inhaltstyp);

        Assert.That(antwort.Status, Is.EqualTo(HttpStatusCode.UnsupportedMediaType));
        Assert.That(server.Anmerkungen.Schnappschuss().Anzahl, Is.Zero);
    }

    [TestCase("DELETE")]
    [TestCase("PUT")]
    public async Task Wenn_weder_POST_noch_GET_dann_405_mit_Allow_POST(string methode)
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();
        using var anfrage = new HttpRequestMessage(new HttpMethod(methode), new Uri(new Uri(server.Adresse), "api/anmerkungen"));

        using var antwort = await client.SendAsync(anfrage);

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.MethodNotAllowed));
        Assert.That(antwort.Content.Headers.Allow, Is.EqualTo(new[] { "POST" }));
    }

    [Test]
    public async Task Wenn_CORS_Vorabanfrage_fremder_Seite_dann_403_ohne_CORS_Freigabe()
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();
        using var anfrage = new HttpRequestMessage(HttpMethod.Options, new Uri(new Uri(server.Adresse), "api/anmerkungen"));
        anfrage.Headers.Add("Origin", "http://localhost:9999");
        anfrage.Headers.Add("Access-Control-Request-Method", "POST");
        anfrage.Headers.Add("Access-Control-Request-Headers", "content-type");

        using var antwort = await client.SendAsync(anfrage);

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.Forbidden));
        Assert.That(antwort.Headers.Select(kopf => kopf.Key), Has.None.StartsWith("Access-Control-"));
    }

    [Test]
    public async Task Wenn_zwei_angelegt_und_GET_mit_eigenem_Host_dann_200_mit_beiden_in_Anlegereihenfolge_ohne_CORS_Freigabe()
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();
        await Sende(client, server, "api/anmerkungen", Gueltig);
        await Sende(client, server, "api/anmerkungen", "{\"commit\":\"" + HashA + "\",\"datei\":\"lang.txt\",\"zeile\":18,\"text\":\"Klammer fehlt\"}");

        var antwort = await Hole(client, server, host: null);

        Assert.That(antwort.Status, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(antwort.Koepfe, Has.None.StartsWith("Access-Control-"));
        var eintraege = antwort.Json.EnumerateArray().Select(eintrag => eintrag.GetRawText()).ToArray();
        Assert.That(eintraege, Is.EqualTo(new[]
        {
            "{\"nummer\":1,\"commit\":\"" + HashA + "\",\"datei\":\"src/Foo.cs\",\"zeile\":42,\"text\":\"Null-Pr\\u00FCfung fehlt\"}",
            "{\"nummer\":2,\"commit\":\"" + HashA + "\",\"datei\":\"lang.txt\",\"zeile\":18,\"text\":\"Klammer fehlt\"}",
        }));
    }

    [Test]
    public async Task Wenn_GET_ohne_Anmerkungen_dann_200_mit_leerer_Liste()
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();

        var antwort = await Hole(client, server, host: null);

        Assert.That((antwort.Status, antwort.Json.GetArrayLength()), Is.EqualTo((HttpStatusCode.OK, 0)));
    }

    [TestCase("localhost")]
    [TestCase("evil.example")]
    public async Task Wenn_GET_mit_fremdem_Host_dann_403_ohne_Anmerkung_im_Koerper(string host)
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();
        await Sende(client, server, "api/anmerkungen", Gueltig);

        var antwort = await Hole(client, server, host: $"{host}:{new Uri(server.Adresse).Port}");

        Assert.That(antwort.Status, Is.EqualTo(HttpStatusCode.Forbidden));
        Assert.That(antwort.Text, Does.Not.Contain("Null-Pr"));
        Assert.That(antwort.Koepfe, Has.None.StartsWith("Access-Control-"));
    }

    [Test]
    public async Task Wenn_500_Anmerkungen_dann_liefert_GET_alle_und_die_Antwortzeit_steht_im_Testprotokoll()
    {
        await using var server = await StarteServer();
        using var client = new HttpClient();
        var text = new string('x', 200);
        for (var zeile = 1; zeile <= 500; zeile++)
        {
            await Sende(client, server, "api/anmerkungen", "{\"commit\":\"" + HashA + "\",\"datei\":\"gross.txt\",\"zeile\":" + zeile + ",\"text\":\"" + text + "\"}");
        }
        await Hole(client, server, host: null);

        var uhr = System.Diagnostics.Stopwatch.StartNew();
        var antwort = await Hole(client, server, host: null);
        uhr.Stop();

        TestContext.Out.WriteLine($"GET /api/anmerkungen mit 500 Anmerkungen: {uhr.Elapsed.TotalMilliseconds:F1} ms");
        Assert.That(antwort.Json.GetArrayLength(), Is.EqualTo(500));
        Assert.That(uhr.Elapsed, Is.LessThan(TimeSpan.FromSeconds(1)));
    }

    private static Task<Webserver> StarteServer()
    {
        return StarteServer(TestUebersichtsquelle.Leer());
    }

    private static async Task<Webserver> StarteServer(TestUebersichtsquelle quelle)
    {
        var commits = new Commitzeilen([new Commitzeile(HashA, "Testperson", "2026-01-01T09:00:00+00:00", "Erster Commit", "")]);
        var protokoll = new StderrProtokoll(new StringWriter(), TimeProvider.System, Protokollstufe.Warnung);
        return await Webserver.StartenAsync(0, commits, TestDateiquelle.Leer(), TestDiffquelle.Leer(), quelle, Oberflaeche.AusDemProgramm(), protokoll);
    }

    private static async Task<(HttpStatusCode Status, JsonElement Json)> Sende(HttpClient client, Webserver server, string pfad, string koerper, string? origin = null, string? host = null, string inhaltstyp = "application/json")
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
        return (antwort.StatusCode, json);
    }

    private static async Task<(HttpStatusCode Status, JsonElement Json, string Text, string[] Koepfe)> Hole(HttpClient client, Webserver server, string? host)
    {
        using var anfrage = new HttpRequestMessage(HttpMethod.Get, new Uri(new Uri(server.Adresse), "api/anmerkungen"));
        if (host is not null)
        {
            anfrage.Headers.Host = host;
        }
        using var antwort = await client.SendAsync(anfrage);
        var text = await antwort.Content.ReadAsStringAsync();
        var json = default(JsonElement);
        var istJson = antwort.StatusCode == HttpStatusCode.OK;
        if (istJson)
        {
            json = JsonDocument.Parse(text).RootElement.Clone();
        }
        var alleKoepfe = antwort.Headers.Concat(antwort.Content.Headers);
        var koepfe = alleKoepfe.Select(kopf => kopf.Key).ToArray();
        return (antwort.StatusCode, json, text, koepfe);
    }
}
