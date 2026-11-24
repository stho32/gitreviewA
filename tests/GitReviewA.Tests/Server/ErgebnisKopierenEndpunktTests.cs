using System.Net;
using System.Text.Json;
using GitReviewA.Anmerkungen;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Protokoll;
using GitReviewA.Server;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Server;

/// <summary>
/// Spezifikation R00020, Kriterium 8 und Schnittstelle: `GET /api/ergebnis` hinter der Host-Prüfung, ohne CORS, ohne Zustandswechsel,
/// 405 für andere Methoden, Debug-Zeile mit Länge. Der Text selbst entsteht im <c>ErgebnisKopierenInteractor</c> (dort geprüft).
/// </summary>
public class ErgebnisKopierenEndpunktTests
{
    private const string HashA = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";
    private const string LeeresErgebnis = "# Ergebnis manueller Review\n\nKeine Anmerkungen.\n";

    [Test]
    public async Task Wenn_Ergebnis_abgefragt_dann_200_JSON_mit_dem_Ergebnis_des_Interactors()
    {
        var ziel = new StringWriter();
        await using var server = await StarteServer(ziel);
        using var client = new HttpClient();

        var antwort = await client.GetAsync(new Uri(new Uri(server.Adresse), "api/ergebnis"));
        var inhalt = await antwort.Content.ReadAsStringAsync();

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(antwort.Content.Headers.ContentType?.MediaType, Is.EqualTo("application/json"));
        using var dokument = JsonDocument.Parse(inhalt);
        Assert.That(dokument.RootElement.GetProperty("ergebnis").GetString(), Is.EqualTo(LeeresErgebnis));
    }

    [Test]
    public async Task Wenn_zwischen_zwei_Anfragen_annotiert_dann_liefert_die_zweite_den_neuen_Stand_und_nichts_ist_gesiegelt()
    {
        await using var server = await StarteServer(new StringWriter());
        using var client = new HttpClient();

        var erste = await Lies(client, server);
        var angelegt = server.Anmerkungen.VersucheAnzuhaengen(new GepruefteAnmerkung(HashA, "a.txt", 2, "Warum groß?"), out _);
        var zweite = await Lies(client, server);

        Assert.That(erste, Is.EqualTo(LeeresErgebnis));
        Assert.That(angelegt, Is.True, "die Kopie darf den Speicher nicht siegeln");
        Assert.That(zweite, Does.Contain("Anmerkungen: 1\n"));
        Assert.That(zweite, Does.Contain("## 1. a.txt:2"));
        Assert.That(server.Anmerkungen.IstAbgeschlossen, Is.False);
    }

    [Test]
    public async Task Wenn_zwischen_zwei_Anfragen_ein_Haken_gesetzt_wird_dann_kommt_er_in_den_Stand_und_der_Stand_vorher_gleicht_dem_nachher_nicht()
    {
        await using var server = await StarteServer(new StringWriter());
        using var client = new HttpClient();

        var erste = await Lies(client, server);
        var haken = server.DateiAbhaken.Setze(new Hakenanfrage(HashA, "a.txt", true));
        var zweite = await Lies(client, server);

        Assert.That(haken.Ausgang, Is.EqualTo(Hakenausgang.Gesetzt), "die Kopie darf die Haken nicht siegeln");
        Assert.That(erste, Is.EqualTo(LeeresErgebnis));
        Assert.That(zweite, Does.Contain("Abgehakt: 1 von 2\n"));
        Assert.That(zweite, Does.Contain($"- a.txt (Commit {HashA})"));
    }

    [Test]
    public async Task Wenn_derselbe_Stand_zweimal_gelesen_wird_dann_derselbe_Text()
    {
        await using var server = await StarteServer(new StringWriter());
        using var client = new HttpClient();

        var erste = await Lies(client, server);
        var zweite = await Lies(client, server);

        Assert.That(zweite, Is.EqualTo(erste));
    }

    [TestCase("POST")]
    [TestCase("PUT")]
    [TestCase("DELETE")]
    public async Task Wenn_andere_Methode_dann_405_und_der_Lauf_geht_weiter(string methode)
    {
        await using var server = await StarteServer(new StringWriter());
        using var client = new HttpClient();
        using var anfrage = new HttpRequestMessage(new HttpMethod(methode), new Uri(new Uri(server.Adresse), "api/ergebnis"));

        using var antwort = await client.SendAsync(anfrage);

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.MethodNotAllowed));
        Assert.That((await client.GetAsync(new Uri(new Uri(server.Adresse), "api/zustand"))).StatusCode, Is.EqualTo(HttpStatusCode.OK));
    }

    [TestCase("fremd.example")]
    [TestCase("localhost")]
    [TestCase("127.0.0.1")]
    public async Task Wenn_Host_fremd_dann_403_und_der_eigene_Host_200(string fremderHost)
    {
        await using var server = await StarteServer(new StringWriter());
        using var client = new HttpClient();

        using var fremd = new HttpRequestMessage(HttpMethod.Get, new Uri(new Uri(server.Adresse), "api/ergebnis"));
        fremd.Headers.Host = fremderHost;
        using var abgelehnt = await client.SendAsync(fremd);
        var eigen = await client.GetAsync(new Uri(new Uri(server.Adresse), "api/ergebnis"));

        Assert.That(abgelehnt.StatusCode, Is.EqualTo(HttpStatusCode.Forbidden));
        Assert.That(eigen.StatusCode, Is.EqualTo(HttpStatusCode.OK));
    }

    [Test]
    public async Task Wenn_gelesen_dann_ohne_CORS_Freigabe_und_mit_Cache_Control_no_store()
    {
        await using var server = await StarteServer(new StringWriter());
        using var client = new HttpClient();

        var antwort = await client.GetAsync(new Uri(new Uri(server.Adresse), "api/ergebnis"));

        Assert.That(antwort.Headers.Contains("Access-Control-Allow-Origin"), Is.False);
        Assert.That(antwort.Headers.CacheControl?.NoStore, Is.True);
    }

    [Test]
    public async Task Wenn_abgefragt_dann_Debug_Zeile_mit_der_Laenge_und_nie_mit_dem_Wortlaut()
    {
        var ziel = new StringWriter();
        await using var server = await StarteServer(ziel);
        server.Anmerkungen.VersucheAnzuhaengen(new GepruefteAnmerkung(HashA, "a.txt", 1, "GEHEIMWORT"), out _);
        using var client = new HttpClient();

        var gelesen = await Lies(client, server);

        Assert.That(ziel.ToString(), Does.Contain($"DEBUG [Kopieren] Ergebnis erzeugt (Länge {gelesen.Length})"));
        Assert.That(ziel.ToString(), Does.Not.Contain("GEHEIMWORT"));
    }

    private static async Task<string> Lies(HttpClient client, Webserver server)
    {
        var inhalt = await client.GetStringAsync(new Uri(new Uri(server.Adresse), "api/ergebnis"));
        using var dokument = JsonDocument.Parse(inhalt);
        return dokument.RootElement.GetProperty("ergebnis").GetString()!;
    }

    private static async Task<Webserver> StarteServer(StringWriter ziel)
    {
        var commits = new Commitzeilen([new Commitzeile(HashA, "Testperson", "2026-01-01T09:00:00+00:00", "Erster Commit", "")]);
        var protokoll = new StderrProtokoll(ziel, TimeProvider.System, Protokollstufe.Debug);
        return await Webserver.StartenAsync(0, commits, TestDateiquelle.Leer(), TestDiffquelle.Leer(), TestUebersichtsquelle.Mit(HashA, "a.txt", "b.txt"), Oberflaeche.AusDemProgramm(), protokoll);
    }
}