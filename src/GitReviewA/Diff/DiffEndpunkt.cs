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
        return (string hash, string? pfad, bool? alsText) =>
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
            var anfrage = new Diffanfrage(hashDerAuswahl, pfad, alsText == true);
            return DiffAntworten(anfrage, dateien, diffquelle, protokoll);
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

    /// <summary>`AlsText`: der Mensch hat bei einer Binärdatei „Als Text zeigen“ gewählt.</summary>
    private sealed record Diffanfrage(string Hash, string Pfad, bool AlsText);

    private static IResult DiffAntworten(Diffanfrage anfrage, GemerkteDateiquelle dateien, IDiffquelle diffquelle, StderrProtokoll protokoll)
    {
        var hash = anfrage.Hash;
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
        var datei = DateiMitPfad(dateienDesCommits, anfrage.Pfad);
        if (datei is null)
        {
            protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"Diff von Commit {hash} abgewiesen: Pfad steht nicht in der Dateiliste (Länge {anfrage.Pfad.Length})");
            return Results.NotFound();
        }
        var wahl = "";
        if (anfrage.AlsText)
        {
            wahl = " als Text";
        }
        protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"GET /api/commits/{hash}/diff Datei {datei.Pfad}{wahl}");
        try
        {
            return Results.Json(AntwortFuer(anfrage, datei, diffquelle), JsonAntwort.Optionen);
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

    /// <summary>Eine Binärdatei kommt mit Grund und ohne Byte-Inhalt — ihren Text liest erst die ausdrückliche Wahl (Entscheidung des PO).</summary>
    private static DiffAntwort AntwortFuer(Diffanfrage anfrage, Dateiaenderung datei, IDiffquelle diffquelle)
    {
        var art = Diffaufbereitung.ArtVon(datei);
        var patch = "";
        string? grund = null;
        if (art == Diffaufbereitung.ArtText)
        {
            patch = diffquelle.Lesen(anfrage.Hash, datei);
        }
        if (art == Diffaufbereitung.ArtBinaer)
        {
            grund = diffquelle.BinaerGrund(anfrage.Hash, datei);
        }
        var binaerAlsTextGewaehlt = art == Diffaufbereitung.ArtBinaer && anfrage.AlsText;
        if (binaerAlsTextGewaehlt)
        {
            patch = diffquelle.AlsTextLesen(anfrage.Hash, datei);
        }
        return new DiffAntwort(datei.Pfad, datei.Status, datei.AlterPfad, art, grund, patch);
    }
}
