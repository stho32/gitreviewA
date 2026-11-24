using System.Net;
using System.Net.Http.Headers;
using System.Text;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Protokoll;
using GitReviewA.Server;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Haken;

/// <summary>
/// Regression zu R00014: Haken und Anmerkung prüfen dieselbe Übersicht, deshalb darf ein Lauf sie genau einmal lesen. Der Zähler
/// sitzt an der Quelle; die beiden Interactors teilen sich im Webserver die gemerkte Übersicht.
/// </summary>
public class HakenUndAnmerkungTeilenEineUebersichtTests
{
    private const string Hash = "13ba46c707f074477c52c93e3598148161e6c26d";

    [Test]
    public async Task Wenn_Haken_und_Anmerkung_geprueft_werden_dann_liest_die_Uebersicht_genau_einmal()
    {
        var quelle = new ZaehlendeUebersichtsquelle(TestUebersichtsquelle.Mit(Hash, "a.txt"));
        await using var server = await StarteServer(quelle);
        using var client = new HttpClient();

        var haken = await Poste(client, server, "api/haken", "{\"commit\":\"" + Hash + "\",\"datei\":\"a.txt\",\"abgehakt\":true}");
        var anmerkung = await Poste(client, server, "api/anmerkungen", "{\"commit\":\"" + Hash + "\",\"datei\":\"a.txt\",\"zeile\":1,\"text\":\"x\"}");

        Assert.That((haken, anmerkung), Is.EqualTo((HttpStatusCode.OK, HttpStatusCode.Created)));
        Assert.That(quelle.Lesungen, Is.EqualTo(1), "Haken und Anmerkung teilen die eine Lesung der Übersicht");
    }

    private static Task<Webserver> StarteServer(IUebersichtsquelle quelle)
    {
        var commits = new Commitzeilen([new Commitzeile(Hash, "Testperson", "2026-01-01T09:00:00+00:00", "Erster Commit", "")]);
        var protokoll = new StderrProtokoll(new StringWriter(), TimeProvider.System, Protokollstufe.Warnung);
        return Webserver.StartenAsync(0, commits, TestDateiquelle.Leer(), TestDiffquelle.Leer(), quelle, Oberflaeche.AusDemProgramm(), protokoll);
    }

    private static async Task<HttpStatusCode> Poste(HttpClient client, Webserver server, string pfad, string koerper)
    {
        using var anfrage = new HttpRequestMessage(HttpMethod.Post, new Uri(new Uri(server.Adresse), pfad));
        anfrage.Content = new StringContent(koerper, Encoding.UTF8);
        anfrage.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
        using var antwort = await client.SendAsync(anfrage);
        return antwort.StatusCode;
    }

    private sealed class ZaehlendeUebersichtsquelle(IUebersichtsquelle quelle) : IUebersichtsquelle
    {
        public int Lesungen { get; private set; }

        public Dateiuebersicht Lesen()
        {
            Lesungen++;
            return quelle.Lesen();
        }
    }
}
