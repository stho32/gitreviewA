using System.Globalization;
using GitReviewA.Anmerkungen;
using GitReviewA.Protokoll;
using GitReviewA.Server;

namespace GitReviewA.Beenden;

/// <summary>
/// Beenden wirkt genau einmal: die erste Anforderung schließt den Speicher ab, bekommt ihre Antwort vollständig
/// und stoppt erst danach den Server. Das Ergebnis schreibt der Hauptablauf, wenn der Server steht.
/// </summary>
internal static class BeendenEndpunkt
{
    private const string Kontext = "Beenden";
    private static readonly BeendetAntwort Beendet = new("beendet");

    public static RequestDelegate Fuer(Anmerkungsspeicher speicher, IHostApplicationLifetime lebensdauer, StderrProtokoll protokoll)
    {
        return async kontext =>
        {
            var istErsteAnforderung = speicher.VersucheAbzuschliessen();
            await JsonAntwort.SendeAsync(kontext, StatusCodes.Status200OK, Beendet);
            if (!istErsteAnforderung)
            {
                return;
            }
            var anzahl = speicher.Schnappschuss().Anzahl.ToString(CultureInfo.InvariantCulture);
            protokoll.Melde(Protokollstufe.Information, Kontext, $"Review beendet mit {anzahl} Anmerkungen");
            await kontext.Response.CompleteAsync();
            lebensdauer.StopApplication();
        };
    }
}
