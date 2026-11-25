using GitReviewA.Server;

namespace GitReviewA.Bild;

/// <summary>
/// Dünner Adapter zwischen HTTP und <see cref="BildLesenInteractor"/>: ohne `pfad` oder mit einer Seite außerhalb der festen
/// Liste 400; ein Hash außerhalb der Auswahl, ein Pfad außerhalb der Dateiliste des Commits oder ein Inhalt, der keiner der
/// vier festen Typen ist, 404; über der Ausgabegrenze 413 mit der Grenze in der Meldung; nicht lesbar 500; sonst 200 mit festem
/// `Content-Type` und den Bytes. Der Typ kommt nie aus dem Repo. `nosniff` setzt die Schutzschicht für jede Antwort.
/// </summary>
internal static class BildEndpunkt
{
    public const string Muster = "/api/commits/{hash}/bild";
    private const string Fehlermeldung = "Bild konnte nicht gelesen werden";

    public static Delegate Fuer(BildLesenInteractor interactor)
    {
        return (string hash, string? pfad, HttpRequest http) =>
        {
            var istBekannteSeite = Bildseitenparameter.Lies(http.Query[Bildseitenparameter.Name], out var seite);
            if (pfad is null || !istBekannteSeite)
            {
                return Results.BadRequest();
            }
            return AlsHttpAntwort(interactor.Lesen(new Bildanfrage(hash, pfad, seite)));
        };
    }

    private static IResult AlsHttpAntwort(Bildergebnis ergebnis)
    {
        switch (ergebnis.Ausgang)
        {
            case Bildausgang.Gelesen:
                return GelesenAntwort(ergebnis);
            case Bildausgang.KeinBild:
            case Bildausgang.NichtGefunden:
            case Bildausgang.NameNichtLesbar:
                return Results.NotFound();
            case Bildausgang.ZuGross:
                return Results.Json(new MeldungAntwort(ergebnis.Meldung ?? ""), JsonAntwort.Optionen, statusCode: StatusCodes.Status413PayloadTooLarge);
            case Bildausgang.NichtLesbar:
                return Results.Json(new MeldungAntwort(Fehlermeldung), JsonAntwort.Optionen, statusCode: StatusCodes.Status500InternalServerError);
            default:
                throw new InvalidOperationException($"Unbekannter Ausgang {ergebnis.Ausgang}");
        }
    }

    private static IResult GelesenAntwort(Bildergebnis ergebnis)
    {
        var antwort = ergebnis.Antwort ?? throw new InvalidOperationException("Gelesen ohne Antwort");
        return Results.Bytes(antwort.Bytes, Bildmedientyp.Fuer(antwort.Art));
    }
}
