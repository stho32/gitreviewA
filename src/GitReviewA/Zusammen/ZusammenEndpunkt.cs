using GitReviewA.Diff;
using GitReviewA.Fremdtext;
using GitReviewA.Server;

namespace GitReviewA.Zusammen;

/// <summary>
/// Adapter zwischen HTTP und <see cref="ZusammenLesenInteractor"/>: `GET /api/zusammen` liefert Kette und Netto-Dateiliste,
/// `GET /api/zusammen/diff?pfad=…&umfang=…` den Diff einer Datei. Beide nur hinter der Host-Prüfung und ohne CORS-Freigabe.
/// Ohne `pfad` oder mit unbekanntem `umfang` 400; ein Pfad außerhalb der Netto-Liste 404 ohne git-Aufruf; ein nicht eindeutiger
/// Anzeigename 422 (wie R00013); über der Ausgabegrenze 200 mit Kennzeichen und Meldung statt eines Patches (wie R00017).
/// </summary>
internal static class ZusammenEndpunkt
{
    public const string Listenmuster = "/api/zusammen";
    public const string Diffmuster = "/api/zusammen/diff";

    private const string NichtLesbarMeldung = "Zusammen-Ansicht konnte nicht gelesen werden";
    private const string NameNichtLesbarMeldung = "Diff dieser Datei nicht lesbar (Name mit ungültigem Byte)";

    public static RequestDelegate Liste(ZusammenLesenInteractor interactor)
    {
        return kontext =>
        {
            var stand = interactor.Stand();
            if (!stand.IstLesbar)
            {
                return JsonAntwort.SendeMeldungAsync(kontext, StatusCodes.Status500InternalServerError, NichtLesbarMeldung);
            }
            return JsonAntwort.SendeAsync(kontext, StatusCodes.Status200OK, AlsListenantwort(stand));
        };
    }

    public static Delegate Diff(ZusammenLesenInteractor interactor)
    {
        return (string? pfad, HttpRequest http) =>
        {
            if (pfad is null || !Umfangsparameter.Lies(http.Query[Umfangsparameter.Name], out var umfang))
            {
                return Results.BadRequest();
            }
            return AlsDiffantwort(interactor.Diff(new Zusammenanfrage(pfad, umfang)));
        };
    }

    private static IResult AlsDiffantwort(ZusammenDiffergebnis ergebnis)
    {
        switch (ergebnis.Ausgang)
        {
            case ZusammenDiffausgang.Gelesen:
                return Results.Json(ergebnis.Antwort, JsonAntwort.Optionen);
            case ZusammenDiffausgang.ZuGross:
                return ZuGrossAntwortFuer(ergebnis);
            case ZusammenDiffausgang.NichtGefunden:
                return Results.NotFound();
            case ZusammenDiffausgang.NameNichtLesbar:
                return Results.Json(new MeldungAntwort(NameNichtLesbarMeldung), JsonAntwort.Optionen, statusCode: StatusCodes.Status422UnprocessableEntity);
            case ZusammenDiffausgang.NichtLesbar:
                return Results.Json(new MeldungAntwort(NichtLesbarMeldung), JsonAntwort.Optionen, statusCode: StatusCodes.Status500InternalServerError);
            default:
                throw new InvalidOperationException($"Unbekannter Ausgang {ergebnis.Ausgang}");
        }
    }

    /// <summary>Über der Ausgabegrenze: Kennzeichen und die Meldung, die die Grenze nennt — kein Patch, kein Fehler.</summary>
    private static IResult ZuGrossAntwortFuer(ZusammenDiffergebnis ergebnis)
    {
        var meldung = "";
        if (ergebnis.Meldung is not null)
        {
            meldung = ergebnis.Meldung;
        }
        return Results.Json(new ZuGrossAntwort(true, meldung), JsonAntwort.Optionen);
    }

    private static ZusammenListenAntwort AlsListenantwort(Zusammenstand stand)
    {
        var dateien = new List<NettoDateiAntwort>(stand.Dateien.Anzahl);
        foreach (var datei in stand.Dateien)
        {
            var stellen = datei.Stellen
                .Select(stelle => new StelleAntwort(stelle.Commit, UnsichtbareZeichen.AlsMarken(stelle.Datei.Pfad)))
                .ToList();
            dateien.Add(new NettoDateiAntwort(datei.Anzeigepfad, datei.Datei.Status, datei.Datei.Plus, datei.Datei.Minus, stellen, datei.ZustaendigerCommit));
        }
        return new ZusammenListenAntwort(stand.Lueckenlos, stand.Basis, stand.Dateien.Beschriftung, dateien);
    }
}

/// <summary>Antwortmodell von `GET /api/zusammen` für den JSON-Serialisierer.</summary>
internal sealed record ZusammenListenAntwort(bool Lueckenlos, string Basis, string Beschriftung, List<NettoDateiAntwort> Dateien);

/// <summary>Eine Datei der Netto-Liste; Stellen und zuständiger Commit stehen für den Haken und die Anmerkung bereit.</summary>
internal sealed record NettoDateiAntwort(string Pfad, string Status, int? Plus, int? Minus, List<StelleAntwort> Stellen, string Zustaendiger);

/// <summary>Eine Stelle als Commit und Anzeigepfad (mit Marken).</summary>
internal sealed record StelleAntwort(string Commit, string Pfad);
