using GitReviewA.Git;
using GitReviewA.Server;
using Microsoft.Extensions.Primitives;

namespace GitReviewA.Diff;

/// <summary>
/// Adapter zwischen HTTP und <see cref="DiffLesenInteractor"/>: liest die Anfrage — ohne Pfad oder mit einem Umfang außerhalb der festen Liste 400 —
/// und bildet das Ergebnis auf den Status ab.
/// </summary>
internal static class DiffEndpunkt
{
    public const string Muster = "/api/commits/{hash}/diff";
    private const string Fehlermeldung = "Diff konnte nicht gelesen werden";
    private const string UmfangParameter = "umfang";

    private static readonly Dictionary<string, Diffumfang> UmfangNachWert = new(StringComparer.Ordinal)
    {
        ["aenderungen"] = Diffumfang.Aenderungen,
        ["ganz"] = Diffumfang.Ganz,
    };

    public static Delegate Fuer(DiffLesenInteractor interactor)
    {
        return (string hash, string? pfad, bool? alsText, HttpRequest http) =>
        {
            var istBekannterUmfang = IstBekannterUmfang(http.Query[UmfangParameter], out var umfang);
            if (pfad is null || !istBekannterUmfang)
            {
                return Results.BadRequest();
            }
            var ergebnis = interactor.Lesen(new Diffanfrage(hash, pfad, alsText == true, umfang));
            return AlsHttpAntwort(ergebnis);
        };
    }

    /// <summary>Ohne Angabe gilt „nur Änderungen“; sonst genau ein Wert aus der Liste, Groß- und Kleinschreibung beachtet.</summary>
    private static bool IstBekannterUmfang(StringValues werte, out Diffumfang umfang)
    {
        umfang = Diffumfang.Aenderungen;
        var umfangFehlt = werte.Count == 0;
        if (umfangFehlt)
        {
            return true;
        }
        var istGenauEinWert = werte.Count == 1;
        return istGenauEinWert && UmfangNachWert.TryGetValue(werte.ToString(), out umfang);
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
