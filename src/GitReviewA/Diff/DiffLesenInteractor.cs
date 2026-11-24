using GitReviewA.Dateien;
using GitReviewA.Git;
using GitReviewA.Protokoll;

namespace GitReviewA.Diff;

/// <summary>
/// Interaction „Diff einer Datei lesen“: git bekommt nur einen vollen Hash der Auswahl und einen Pfad, der genau so in der Dateiliste
/// dieses Commits steht — alles andere endet vorher als <see cref="Diffausgang.NichtGefunden"/>.
/// </summary>
internal sealed class DiffLesenInteractor(Commitzeilen commits, GemerkteDateiquelle dateien, IDiffquelle diffquelle, StderrProtokoll protokoll)
{
    private const string Anfragekontext = "Anfrage";
    private const string Fehlerkontext = "Diff";

    private readonly Dictionary<string, string> hashNachSchreibweise = HashesDerAuswahl(commits);

    public Differgebnis Lesen(Diffanfrage anfrage)
    {
        var istHashDerAuswahl = hashNachSchreibweise.TryGetValue(anfrage.Hash, out var hash);
        if (!istHashDerAuswahl || hash is null)
        {
            return Differgebnis.NichtGefunden;
        }
        Dateiaenderungen dateienDesCommits;
        try
        {
            dateienDesCommits = dateien.GemerktOderGelesen(hash);
        }
        catch (GitFehler fehler)
        {
            protokoll.Melde(Protokollstufe.Fehler, Fehlerkontext, $"Dateiliste von Commit {hash} für den Diff nicht lesbar: {fehler.Message}");
            return Differgebnis.NichtLesbar;
        }
        var datei = DateiMitPfad(dateienDesCommits, anfrage.Pfad);
        if (datei is null)
        {
            protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"Diff von Commit {hash} abgewiesen: Pfad steht nicht in der Dateiliste (Länge {anfrage.Pfad.Length})");
            return Differgebnis.NichtGefunden;
        }
        protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"GET /api/commits/{hash}/diff Datei {datei.Pfad}{WahlText(anfrage)}");
        try
        {
            return Differgebnis.Gelesen(AntwortFuer(hash, anfrage, datei));
        }
        catch (GitFehler fehler)
        {
            protokoll.Melde(Protokollstufe.Fehler, Fehlerkontext, $"Diff von Commit {hash}, Datei {datei.Pfad} nicht lesbar: {fehler.Message}");
            return Differgebnis.NichtLesbar;
        }
    }

    private static Dictionary<string, string> HashesDerAuswahl(Commitzeilen commits)
    {
        var auswahl = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var commit in commits)
        {
            auswahl[commit.Hash] = commit.Hash;
        }
        return auswahl;
    }

    /// <summary>Genau gleich, Groß- und Kleinschreibung beachtet: ein Ordner, ein Muster oder eine andere Schreibweise ist keine Datei der Liste.</summary>
    private static Dateiaenderung? DateiMitPfad(Dateiaenderungen dateienDesCommits, string pfad)
    {
        foreach (var datei in dateienDesCommits)
        {
            var istGesuchterPfad = string.Equals(datei.Pfad, pfad, StringComparison.Ordinal);
            if (istGesuchterPfad)
            {
                return datei;
            }
        }
        return null;
    }

    private static string WahlText(Diffanfrage anfrage)
    {
        if (anfrage.AlsText)
        {
            return " als Text";
        }
        return "";
    }

    /// <summary>Eine Binärdatei kommt mit Grund und ohne Byte-Inhalt — ihren Text liest erst die ausdrückliche Wahl (Entscheidung des PO).</summary>
    private DiffAntwort AntwortFuer(string hash, Diffanfrage anfrage, Dateiaenderung datei)
    {
        var art = Diffaufbereitung.ArtVon(datei);
        var patch = "";
        string? grund = null;
        if (art == Diffaufbereitung.ArtText)
        {
            patch = diffquelle.Lesen(hash, datei);
        }
        if (art == Diffaufbereitung.ArtBinaer)
        {
            grund = diffquelle.BinaerGrund(hash, datei);
        }
        var binaerAlsTextGewaehlt = art == Diffaufbereitung.ArtBinaer && anfrage.AlsText;
        if (binaerAlsTextGewaehlt)
        {
            patch = diffquelle.AlsTextLesen(hash, datei);
        }
        return new DiffAntwort(datei.Pfad, datei.Status, datei.AlterPfad, art, grund, patch);
    }
}
