using System.Globalization;
using GitReviewA.Anmerkungen;
using GitReviewA.Haken;
using GitReviewA.Protokoll;
using GitReviewA.Server;

namespace GitReviewA.Beenden;

/// <summary>
/// Beenden wirkt genau einmal: die erste vollständig empfangene Anforderung schließt Anmerkungen und Haken ab, bekommt ihre
/// Antwort vollständig und stoppt erst danach den Server. Eine Anforderung, deren Körper nie ganz ankommt, ist kein
/// Beenden — ein Abbruch in dieser Zeit bleibt ein Abbruch. Ist der Abbruch schon angenommen, antwortet der Endpunkt 409
/// mit dem geltenden Zustand und wirkt nicht (R00050). Das Ergebnis schreibt der Hauptablauf, wenn der Server steht.
/// </summary>
internal static class BeendenEndpunkt
{
    private const string Kontext = "Beenden";
    private static readonly BeendetAntwort Beendet = new("beendet");
    private static readonly BeendetAntwort Abgebrochen = new("abgebrochen");

    public static RequestDelegate Fuer(Anmerkungsspeicher speicher, Hakenspeicher haken, Laufende laufende, IHostApplicationLifetime lebensdauer, StderrProtokoll protokoll)
    {
        return async kontext =>
        {
            var istVollstaendigEmpfangen = await Anfragekoerper.LiesBisZumEndeAsync(kontext);
            if (!istVollstaendigEmpfangen)
            {
                return;
            }
            var versuch = laufende.Versuche(Laufentscheidung.Beenden);
            if (!versuch.Angenommen && versuch.Zustand == Laufentscheidung.Abbruch)
            {
                await JsonAntwort.SendeAsync(kontext, StatusCodes.Status409Conflict, Abgebrochen);
                return;
            }
            speicher.VersucheAbzuschliessen();
            haken.VersucheZuSiegeln();
            await JsonAntwort.SendeAsync(kontext, StatusCodes.Status200OK, Beendet);
            if (!versuch.Angenommen)
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