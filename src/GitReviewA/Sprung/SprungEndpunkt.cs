using GitReviewA.Server;

namespace GitReviewA.Sprung;

/// <summary>
/// Adapter zwischen HTTP und <see cref="SprungInteractor"/>: `GET /api/commits/{hash}/sprung?pfad=…` liefert
/// `200 {ziel, geaendert, grund}` (ohne Zeile — die hängt der Browser an), ohne `pfad` 400, bei Hash außerhalb der Aufrufmenge oder
/// Pfad außerhalb der Dateiliste 404 ohne git-Aufruf. Nur hinter der Host-Prüfung und ohne CORS-Freigabe.
/// </summary>
internal static class SprungEndpunkt
{
    public const string Muster = "/api/commits/{hash}/sprung";

    private const string Fehlermeldung = "Sprungziel konnte nicht gelesen werden";

    public static Delegate Fuer(SprungInteractor interactor)
    {
        return (string hash, string? pfad) =>
        {
            if (pfad is null)
            {
                return Results.BadRequest();
            }
            return AlsHttpAntwort(interactor.Lesen(new Sprunganfrage(hash, pfad)));
        };
    }

    private static IResult AlsHttpAntwort(Sprungergebnis ergebnis)
    {
        switch (ergebnis.Ausgang)
        {
            case Sprungausgang.Beantwortet:
                return Results.Json(new Sprungantwort(ergebnis.Ziel, ergebnis.Geaendert, ergebnis.Grund), JsonAntwort.Optionen);
            case Sprungausgang.NichtGefunden:
                return Results.NotFound();
            case Sprungausgang.NichtLesbar:
                return Results.Json(new MeldungAntwort(Fehlermeldung), JsonAntwort.Optionen, statusCode: StatusCodes.Status500InternalServerError);
            default:
                throw new InvalidOperationException($"Unbekannter Ausgang {ergebnis.Ausgang}");
        }
    }
}

/// <summary>Antwortmodell von `GET /api/commits/{hash}/sprung` für den JSON-Serialisierer.</summary>
internal sealed record Sprungantwort(string Ziel, bool Geaendert, string Grund);
