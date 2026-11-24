using GitReviewA.Server;

namespace GitReviewA.Anmerkungen;

/// <summary>
/// Adapter für `GET /api/anmerkungen`: alle Anmerkungen des Laufs in Anlegereihenfolge. Geschützt nur durch die Host-Prüfung jeder Anfrage
/// (DNS-Rebinding); ohne CORS-Freigabe kann keine fremde Seite die Antwort lesen.
/// </summary>
internal static class AnmerkungenListeEndpunkt
{
    public static RequestDelegate Fuer(ZeileAnnotierenInteractor interactor)
    {
        return kontext =>
        {
            var anmerkungen = new List<Anmerkung>();
            foreach (var anmerkung in interactor.Liste())
            {
                anmerkungen.Add(anmerkung);
            }
            return JsonAntwort.SendeAsync(kontext, StatusCodes.Status200OK, anmerkungen);
        };
    }
}
