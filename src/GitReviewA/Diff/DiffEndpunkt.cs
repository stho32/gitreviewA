using GitReviewA.Dateien;
using GitReviewA.Git;
using GitReviewA.Protokoll;
using GitReviewA.Server;

namespace GitReviewA.Diff;

/// <summary>
/// Der Diff einer Datei, gelesen erst auf Anfrage. git bekommt nur einen vollen Hash der Auswahl und einen Pfad, der genau so in der
/// Dateiliste dieses Commits steht — alles andere endet vorher mit 404 (ohne Pfad: 400).
/// </summary>
internal static class DiffEndpunkt
{
    public const string Muster = "/api/commits/{hash}/diff";
    private const string Anfragekontext = "Anfrage";
    private const string Fehlerkontext = "Diff";
    private const string Fehlermeldung = "Diff konnte nicht gelesen werden";

    public static Delegate Fuer(Commitzeilen commits, GemerkteDateiquelle dateien, IDiffquelle diffquelle, StderrProtokoll protokoll)
    {
        var auswahl = HashesDerAuswahl(commits);
        return (string hash, string? pfad) =>
        {
            var istHashDerAuswahl = auswahl.TryGetValue(hash, out var hashDerAuswahl);
            if (!istHashDerAuswahl || hashDerAuswahl is null)
            {
                return Results.NotFound();
            }
            if (pfad is null)
            {
                return Results.BadRequest();
            }
            return DiffAntworten(hashDerAuswahl, pfad, dateien, diffquelle, protokoll);
        };
    }

    private static Dictionary<string, string> HashesDerAuswahl(Commitzeilen commits)
    {
        var hashNachSchreibweise = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var commit in commits)
        {
            hashNachSchreibweise[commit.Hash] = commit.Hash;
        }
        return hashNachSchreibweise;
    }

    private static IResult DiffAntworten(string hash, string pfad, GemerkteDateiquelle dateien, IDiffquelle diffquelle, StderrProtokoll protokoll)
    {
        Dateiaenderungen dateienDesCommits;
        try
        {
            dateienDesCommits = dateien.GemerktOderGelesen(hash);
        }
        catch (GitFehler fehler)
        {
            protokoll.Melde(Protokollstufe.Fehler, Fehlerkontext, $"Dateiliste von Commit {hash} für den Diff nicht lesbar: {fehler.Message}");
            return Fehlerantwort();
        }
        var datei = DateiMitPfad(dateienDesCommits, pfad);
        if (datei is null)
        {
            protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"Diff von Commit {hash} abgewiesen: Pfad steht nicht in der Dateiliste (Länge {pfad.Length})");
            return Results.NotFound();
        }
        protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"GET /api/commits/{hash}/diff Datei {datei.Pfad}");
        try
        {
            return Results.Json(AntwortFuer(hash, datei, diffquelle), JsonAntwort.Optionen);
        }
        catch (GitFehler fehler)
        {
            protokoll.Melde(Protokollstufe.Fehler, Fehlerkontext, $"Diff von Commit {hash}, Datei {datei.Pfad} nicht lesbar: {fehler.Message}");
            return Fehlerantwort();
        }
    }

    private static IResult Fehlerantwort()
    {
        return Results.Json(new MeldungAntwort(Fehlermeldung), JsonAntwort.Optionen, statusCode: StatusCodes.Status500InternalServerError);
    }

    /// <summary>Genau gleich, Groß- und Kleinschreibung beachtet: ein Ordner, ein Muster oder eine andere Schreibweise ist keine Datei der Liste.</summary>
    private static Dateiaenderung? DateiMitPfad(Dateiaenderungen dateien, string pfad)
    {
        foreach (var datei in dateien)
        {
            var istGesuchtePfad = string.Equals(datei.Pfad, pfad, StringComparison.Ordinal);
            if (istGesuchtePfad)
            {
                return datei;
            }
        }
        return null;
    }

    private static DiffAntwort AntwortFuer(string hash, Dateiaenderung datei, IDiffquelle diffquelle)
    {
        var art = Diffaufbereitung.ArtVon(datei);
        var patch = "";
        var hatZeilen = art == Diffaufbereitung.ArtText;
        if (hatZeilen)
        {
            patch = diffquelle.Lesen(hash, datei);
        }
        return new DiffAntwort(datei.Pfad, datei.Status, datei.AlterPfad, art, patch);
    }
}
