using System.Net;
using System.Net.Sockets;
using System.Text;
using GitReviewA.Beenden;
using GitReviewA.Git;
using GitReviewA.Protokoll;
using GitReviewA.Server;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Beenden;

/// <summary>
/// R00050, Kriterium 11: der Server beantwortet jede bei ihm eingetroffene Anfrage an <c>/api/beenden</c> und
/// <c>/api/abbrechen</c> mit dem geltenden Endzustand, bevor er stoppt. Der Einmal-Schalter, die Antwort und erst
/// danach der Stopp — die Reihenfolge macht diese Probe sichtbar: beide gleichzeitig eintreffenden Anforderungen
/// bekommen eine Antwort (200 für den Gewinner, 409 mit demselben Zustand für den Verlierer), und eine Anfrage, die
/// schon eingetroffen ist, während der Gewinner entscheidet, wird noch beantwortet (kein Verbindungsabbruch).
/// Eine Anfrage, die erst nach dem Ende des Prozesses eintrifft, erreicht keinen Server mehr — dafür zeigt die
/// Oberfläche den Endzustand (`e2e/tests/beenden-zwei-tabs.spec.js`).
/// </summary>
public class BeendenGegenAbbruchTests
{
    private const string HashA = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";
    private static readonly TimeSpan Frist = TimeSpan.FromSeconds(5);

    [Test]
    public async Task Wenn_Beenden_und_Abbrechen_gleichzeitig_eintreffen_dann_bekommen_beide_eine_Antwort()
    {
        await using var server = await StarteServer();
        using var clientBeenden = new HttpClient();
        using var clientAbbrechen = new HttpClient();

        var beenden = Sende(clientBeenden, server, "api/beenden");
        var abbrechen = Sende(clientAbbrechen, server, "api/abbrechen");
        var antworten = await Task.WhenAll(beenden, abbrechen);

        Assert.That(antworten.Select(antwort => antwort.Status).Order(), Is.EqualTo(new[] { HttpStatusCode.OK, HttpStatusCode.Conflict }),
            "eine Anforderung gewinnt (200), die andere wird mit 409 beantwortet — keine ohne Antwort");
        var gewinner = antworten.Single(antwort => antwort.Status == HttpStatusCode.OK);
        var verlierer = antworten.Single(antwort => antwort.Status == HttpStatusCode.Conflict);
        Assert.That(verlierer.Koerper, Is.EqualTo(gewinner.Koerper), "der Verlierer erfährt den geltenden Endzustand");
        Assert.That(gewinner.Koerper, Is.EqualTo($"{{\"zustand\":\"{Endzustand(server.Laufende.Zustand)}\"}}"));
        await server.WartenBisBeendetAsync().WaitAsync(Frist);
    }

    [Test]
    public async Task Wenn_eine_Anfrage_schon_eingetroffen_ist_dann_beantwortet_der_Server_sie_noch_vor_dem_Stopp()
    {
        await using var server = await StarteServer();
        var port = new Uri(server.Adresse).Port;
        using var verbindung = new TcpClient();
        await verbindung.ConnectAsync(IPAddress.Loopback, port);
        await using var strom = verbindung.GetStream();

        // Die Abbruchanforderung ist eingetroffen: Kopf und Anfang des Körpers sind gesendet, der Rest kommt erst später an.
        var kopf = $"POST /api/abbrechen HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nContent-Type: application/json\r\nContent-Length: 4\r\nConnection: close\r\n\r\n{{";
        await strom.WriteAsync(Encoding.ASCII.GetBytes(kopf));
        await strom.FlushAsync();
        await Task.Delay(200, TestContext.CurrentContext.CancellationToken);

        // Jetzt gewinnt „Beenden“ und der Server stoppt geordnet — die eingetroffene Anfrage läuft dabei noch.
        using var client = new HttpClient();
        var beendet = await Sende(client, server, "api/beenden");
        Assert.That(beendet.Status, Is.EqualTo(HttpStatusCode.OK));

        // Der Körper kommt ganz an: die eingetroffene Anfrage wird mit 409 und dem geltenden Zustand beantwortet.
        await strom.WriteAsync(Encoding.ASCII.GetBytes("}  "));
        await strom.FlushAsync();
        var antwort = await LiesAntwort(strom);

        Assert.That(antwort, Does.StartWith("HTTP/1.1 409"));
        Assert.That(antwort, Does.Contain("{\"zustand\":\"beendet\"}"));
        await server.WartenBisBeendetAsync().WaitAsync(Frist);
        Assert.That(server.Laufende.Zustand, Is.EqualTo(Laufentscheidung.Beenden));
    }

    private static string Endzustand(Laufentscheidung zustand)
    {
        return zustand == Laufentscheidung.Abbruch ? "abgebrochen" : "beendet";
    }

    private static async Task<string> LiesAntwort(NetworkStream strom)
    {
        var puffer = new byte[4096];
        var text = new StringBuilder();
        while (true)
        {
            var gelesen = await strom.ReadAsync(puffer, TestContext.CurrentContext.CancellationToken).AsTask().WaitAsync(Frist);
            if (gelesen == 0)
            {
                return text.ToString();
            }
            text.Append(Encoding.UTF8.GetString(puffer, 0, gelesen));
        }
    }

    private static async Task<(HttpStatusCode Status, string Koerper)> Sende(HttpClient client, Webserver server, string pfad)
    {
        using var inhalt = new StringContent("{}", Encoding.UTF8, "application/json");
        using var antwort = await client.PostAsync(new Uri(new Uri(server.Adresse), pfad), inhalt);
        return (antwort.StatusCode, await antwort.Content.ReadAsStringAsync());
    }

    private static async Task<Webserver> StarteServer()
    {
        var commits = new Commitzeilen([new Commitzeile(HashA, "Testperson", "2026-01-01T09:00:00+00:00", "Erster Commit", "")]);
        var protokoll = new StderrProtokoll(new StringWriter(), TimeProvider.System, Protokollstufe.Warnung);
        return await Webserver.StartenAsync(0, commits, TestDateiquelle.Leer(), TestDiffquelle.Leer(), TestUebersichtsquelle.Mit(HashA, "a.txt"), TestZusammenquelle.Leer(), Oberflaeche.AusDemProgramm(), protokoll);
    }
}
