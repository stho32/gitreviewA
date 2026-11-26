using GitReviewA.Protokoll;
using GitReviewA.Server;

namespace GitReviewA.Beenden;

/// <summary>
/// `POST /api/abbrechen` (R00050): der zweite Weg zum selben Abbruch wie Strg+C. Der Einmal-Schalter ist gemeinsam mit dem
/// Beenden — ist dieses schon angenommen, antwortet der Endpunkt 409 mit dem geltenden Zustand und tut nichts; der erste
/// angenommene Abbruch antwortet 200, beendet die Antwort und stoppt den Server geordnet. Den Ausgang (nichts auf stdout,
/// eine Abbruchzeile, Exit 130) entscheidet der Hauptablauf über <see cref="AbbruchEntscheidung"/>. Kein eigener Log-Eintrag:
/// die eine Abbruchzeile steht im Hauptablauf, egal ob Signal oder Knopf.
/// </summary>
internal static class AbbrechenEndpunkt
{
    private static readonly BeendetAntwort Abgebrochen = new("abgebrochen");
    private static readonly BeendetAntwort Beendet = new("beendet");

    public static RequestDelegate Fuer(Laufende laufende, IHostApplicationLifetime lebensdauer)
    {
        return async kontext =>
        {
            var istVollstaendigEmpfangen = await Anfragekoerper.LiesBisZumEndeAsync(kontext);
            if (!istVollstaendigEmpfangen)
            {
                return;
            }
            var versuch = laufende.Versuche(Laufentscheidung.Abbruch);
            if (!versuch.Angenommen && versuch.Zustand == Laufentscheidung.Beenden)
            {
                await JsonAntwort.SendeAsync(kontext, StatusCodes.Status409Conflict, Beendet);
                return;
            }
            await JsonAntwort.SendeAsync(kontext, StatusCodes.Status200OK, Abgebrochen);
            if (!versuch.Angenommen)
            {
                return;
            }
            await kontext.Response.CompleteAsync();
            lebensdauer.StopApplication();
        };
    }
}