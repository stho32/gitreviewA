using System.Globalization;
using GitReviewA.Anmerkungen;
using GitReviewA.Protokoll;
using GitReviewA.Server;

namespace GitReviewA.Beenden;

/// <summary>
/// Beenden wirkt genau einmal: die erste vollständig empfangene Anforderung schließt den Speicher ab, bekommt ihre
/// Antwort vollständig und stoppt erst danach den Server. Eine Anforderung, deren Körper nie ganz ankommt, ist kein
/// Beenden — ein Abbruch in dieser Zeit bleibt ein Abbruch. Das Ergebnis schreibt der Hauptablauf, wenn der Server steht.
/// </summary>
internal static class BeendenEndpunkt
{
    private const string Kontext = "Beenden";
    private static readonly BeendetAntwort Beendet = new("beendet");

    public static RequestDelegate Fuer(Anmerkungsspeicher speicher, IHostApplicationLifetime lebensdauer, StderrProtokoll protokoll)
    {
        return async kontext =>
        {
            var istVollstaendigEmpfangen = await LiesKoerperBisZumEndeAsync(kontext);
            if (!istVollstaendigEmpfangen)
            {
                return;
            }
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

    private static async Task<bool> LiesKoerperBisZumEndeAsync(HttpContext kontext)
    {
        try
        {
            await kontext.Request.Body.CopyToAsync(Stream.Null, kontext.RequestAborted);
            return true;
        }
        catch (IOException)
        {
            return false;
        }
        catch (OperationCanceledException)
        {
            return false;
        }
    }
}
