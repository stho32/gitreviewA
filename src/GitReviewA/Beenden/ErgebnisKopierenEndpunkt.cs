using System.Globalization;
using GitReviewA.Protokoll;
using GitReviewA.Server;

namespace GitReviewA.Beenden;

/// <summary>
/// Adapter für `GET /api/ergebnis` (R00020): gibt das Ergebnis des <see cref="ErgebnisKopierenInteractor"/> als JSON aus. Nur durch die
/// Host-Prüfung jeder Anfrage geschützt (DNS-Rebinding), ohne CORS-Freigabe, ohne Zustandswechsel; die Debug-Zeile nennt die Länge,
/// nie den Wortlaut.
/// </summary>
internal static class ErgebnisKopierenEndpunkt
{
    private const string Kontext = "Kopieren";

    public static RequestDelegate Fuer(ErgebnisKopierenInteractor interactor, StderrProtokoll protokoll)
    {
        return kontext =>
        {
            var antwort = interactor.Erzeuge();
            var laenge = antwort.Ergebnis.Length.ToString(CultureInfo.InvariantCulture);
            protokoll.Melde(Protokollstufe.Debug, Kontext, $"Ergebnis erzeugt (Länge {laenge})");
            return JsonAntwort.SendeAsync(kontext, StatusCodes.Status200OK, antwort);
        };
    }
}