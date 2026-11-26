using GitReviewA.Dateiansicht;
using GitReviewA.Protokoll;

namespace GitReviewA.Server;

/// <summary>
/// Der Server der Dateiansicht (R00043, B4204/B4205): dieselben Schutzschichten wie der Review, aber nur die Endpunkte dieser
/// Laufart — kein Review-Endpunkt ist registriert, also antworten sie 404 ohne Pfadtext-Prüfung. Die Seite ist eine eigene Datei.
/// </summary>
internal sealed class DateiansichtServer : IAsyncDisposable
{
    private const string Startseite = "dateiansicht.html";

    private readonly WebApplication anwendung;
    private readonly Dateiansichtlaufzustand zustand;

    private DateiansichtServer(WebApplication anwendung, int port, Dateiansichtlaufzustand zustand)
    {
        this.anwendung = anwendung;
        this.zustand = zustand;
        Adresse = $"http://{HostPruefung.Rechneradresse}:{port}/";
    }

    public string Adresse { get; }

    public bool IstGeschlossen => zustand.IstGeschlossen;

    public static async Task<DateiansichtServer> StarteAsync(Dateiansichtsstand stand, int port, Oberflaeche oberflaeche, StderrProtokoll protokoll)
    {
        var lauscherPort = new Serverbau.LauscherPort();
        var anwendung = Serverbau.Baue(port, protokoll, lauscherPort);
        var zustand = new Dateiansichtlaufzustand();
        anwendung.MapGet(DateiansichtEndpunkt.Listenmuster, DateiansichtEndpunkt.Liste(stand));
        anwendung.MapGet(DateiansichtEndpunkt.Textmuster, DateiansichtEndpunkt.Text(stand));
        anwendung.Map(DateiansichtEndpunkt.Schliessenmuster, GeschuetzterEndpunkt.Mit(DateiansichtEndpunkt.Schliessen(zustand, anwendung.Lifetime, protokoll), protokoll));
        Serverbau.BaueOberflaechenrouten(anwendung, oberflaeche, Startseite);
        await anwendung.StartAsync();
        lauscherPort.Wert = Serverbau.TatsaechlicherPort(anwendung);
        return new DateiansichtServer(anwendung, lauscherPort.Wert, zustand);
    }

    public Task WartenBisBeendetAsync()
    {
        return anwendung.WaitForShutdownAsync();
    }

    public async ValueTask DisposeAsync()
    {
        await anwendung.StopAsync();
        await anwendung.DisposeAsync();
    }
}
