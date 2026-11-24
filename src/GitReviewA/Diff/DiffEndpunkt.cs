using GitReviewA.Git;
using GitReviewA.Server;

namespace GitReviewA.Diff;
/// <summary>
/// Adapter zwischen HTTP und <see cref="DiffLesenInteractor"/>: liest die Anfrage — ohne Pfad oder mit einem Umfang außerhalb der festen Liste 400 —
/// und bildet das Ergebnis auf den Status ab: ein Name, der keine Datei eindeutig meint oder sich nicht an git geben lässt, ist 422.
/// </summary>
internal static class DiffEndpunkt
{
    public const string Muster = "/api/commits/{hash}/diff";
    private const string Fehlermeldung = "Diff konnte nicht gelesen werden";
    private const string NameNichtLesbarMeldung = "Diff dieser Datei nicht lesbar (Name mit ungültigem Byte)";

    private static readonly Dictionary<Diffausgang, Func<Differgebnis, IResult>> AntwortNachAusgang = new()
    {
        [Diffausgang.Gelesen] = GelesenAntwort,
        [Diffausgang.ZuGross] = ZuGrossAntwort,
        [Diffausgang.NichtGefunden] = NichtGefundenAntwort,
        [Diffausgang.NichtLesbar] = NichtLesbarAntwort,
        [Diffausgang.NameNichtLesbar] = NameNichtLesbarAntwort,
    };

    public static Delegate Fuer(DiffLesenInteractor interactor)
    {
        return (string hash, string? pfad, bool? alsText, HttpRequest http) =>
        {
            var istBekannterUmfang = Umfangsparameter.Lies(http.Query[Umfangsparameter.Name], out var umfang);
            if (pfad is null || !istBekannterUmfang)
            {
                return Results.BadRequest();
            }
            var ergebnis = interactor.Lesen(new Diffanfrage(hash, pfad, alsText == true, umfang));
            return AlsHttpAntwort(ergebnis);
        };
    }

    private static IResult AlsHttpAntwort(Differgebnis ergebnis)
    {
        var istBekannterAusgang = AntwortNachAusgang.TryGetValue(ergebnis.Ausgang, out var antwort);
        if (!istBekannterAusgang || antwort is null)
        {
            throw new InvalidOperationException($"Unbekannter Ausgang {ergebnis.Ausgang}");
        }
        return antwort(ergebnis);
    }

    private static IResult GelesenAntwort(Differgebnis ergebnis)
    {
        return Results.Json(ergebnis.Antwort, JsonAntwort.Optionen);
    }

    /// <summary>Über der Ausgabegrenze: Kennzeichen und die Meldung, die die Grenze nennt — kein Patch.</summary>
    private static IResult ZuGrossAntwort(Differgebnis ergebnis)
    {
        var meldung = "";
        if (ergebnis.Meldung is not null)
        {
            meldung = ergebnis.Meldung;
        }
        return Results.Json(new ZuGrossAntwort(true, meldung), JsonAntwort.Optionen);
    }

    private static IResult NichtGefundenAntwort(Differgebnis _)
    {
        return Results.NotFound();
    }

    private static IResult NichtLesbarAntwort(Differgebnis _)
    {
        return Results.Json(new MeldungAntwort(Fehlermeldung), JsonAntwort.Optionen, statusCode: StatusCodes.Status500InternalServerError);
    }

    private static IResult NameNichtLesbarAntwort(Differgebnis _)
    {
        return Results.Json(new MeldungAntwort(NameNichtLesbarMeldung), JsonAntwort.Optionen, statusCode: StatusCodes.Status422UnprocessableEntity);
    }
}
