using GitReviewA.Git;
using GitReviewA.Server;

namespace GitReviewA.Diff;

/// <summary>Adapter zwischen HTTP und <see cref="DiffLesenInteractor"/>: liest die Anfrage, ohne Pfad 400, und bildet das Ergebnis auf den Status ab.</summary>
internal static class DiffEndpunkt
{
    public const string Muster = "/api/commits/{hash}/diff";
    private const string Fehlermeldung = "Diff konnte nicht gelesen werden";

    public static Delegate Fuer(DiffLesenInteractor interactor)
    {
        return (string hash, string? pfad, bool? alsText) =>
        {
            if (pfad is null)
            {
                return Results.BadRequest();
            }
            var ergebnis = interactor.Lesen(new Diffanfrage(hash, pfad, alsText == true, Diffumfang.Aenderungen));
            return AlsHttpAntwort(ergebnis);
        };
    }

    private static IResult AlsHttpAntwort(Differgebnis ergebnis)
    {
        switch (ergebnis.Ausgang)
        {
            case Diffausgang.Gelesen:
                return Results.Json(ergebnis.Antwort, JsonAntwort.Optionen);
            case Diffausgang.NichtGefunden:
                return Results.NotFound();
            case Diffausgang.NichtLesbar:
                return Results.Json(new MeldungAntwort(Fehlermeldung), JsonAntwort.Optionen, statusCode: StatusCodes.Status500InternalServerError);
            default:
                throw new InvalidOperationException($"Unbekannter Ausgang {ergebnis.Ausgang}");
        }
    }
}
