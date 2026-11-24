using GitReviewA.Aufruf;
using GitReviewA.Dateien;
using GitReviewA.Diff;
using GitReviewA.Git;
using GitReviewA.Protokoll;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>Treiber in-process: verdrahtet den Interactor wie der Programmstart (Wurzel des Startordners, echtes git) und kennt als einziger seine Typen.</summary>
internal sealed class DiffLesenTreiber
{
    private readonly DiffLesenInteractor interactor;
    private readonly StringWriter protokollziel;

    private DiffLesenTreiber(DiffLesenInteractor interactor, StringWriter protokollziel)
    {
        this.interactor = interactor;
        this.protokollziel = protokollziel;
    }

    public static DiffLesenTreiber Starten(string startordner, IEnumerable<string> hashes)
    {
        var commits = GitLeser.Lesen(new CommitHashes(hashes), startordner);
        var arbeitsordner = GitLeser.WurzelLesen(startordner);
        var protokollziel = new StringWriter();
        var protokoll = new StderrProtokoll(protokollziel, TimeProvider.System, Protokollstufe.Debug);
        var dateien = new GemerkteDateiquelle(new GitDateiquelle(arbeitsordner));
        var interactor = new DiffLesenInteractor(commits, dateien, new GitDiffquelle(arbeitsordner), protokoll);
        return new DiffLesenTreiber(interactor, protokollziel);
    }

    public Dateiansicht Lesen(string hash, string pfad, bool ganzeDatei)
    {
        var umfang = Diffumfang.Aenderungen;
        if (ganzeDatei)
        {
            umfang = Diffumfang.Ganz;
        }
        var ergebnis = interactor.Lesen(new Diffanfrage(hash, pfad, false, umfang));
        return Dateiansicht.Aus(ergebnis);
    }

    public string[] Protokollzeilen()
    {
        return protokollziel.ToString().Split('\n', StringSplitOptions.RemoveEmptyEntries);
    }
}

/// <summary>
/// Was der Diff-Bereich aus einer Antwort zeigt, in Patch-Schreibweise: `Zeilen` ohne Abschnittsköpfe (` z01`, `-z03`, `+Z03`, `\ No newline …`),
/// `Ausgang` `gelesen`, `nicht gefunden` oder `nicht lesbar`.
/// </summary>
internal sealed record Dateiansicht(string Ausgang, string? Pfad, string? Art, string[] Abschnittskoepfe, string[] Zeilen)
{
    public static Dateiansicht Aus(Differgebnis ergebnis)
    {
        var antwort = ergebnis.Antwort;
        if (antwort is null)
        {
            var ausgang = "nicht lesbar";
            if (ergebnis.Ausgang == Diffausgang.NichtGefunden)
            {
                ausgang = "nicht gefunden";
            }
            return new Dateiansicht(ausgang, null, null, [], []);
        }
        var patchzeilen = antwort.Patch.Split('\n');
        var ohneLetztesZeilenende = patchzeilen.Take(patchzeilen.Length - 1).ToArray();
        var koepfe = ohneLetztesZeilenende.Where(zeile => zeile.StartsWith("@@ ", StringComparison.Ordinal)).ToArray();
        var zeilen = ohneLetztesZeilenende.Where(zeile => !zeile.StartsWith("@@ ", StringComparison.Ordinal)).ToArray();
        return new Dateiansicht("gelesen", antwort.Pfad, antwort.Art, koepfe, zeilen);
    }

    /// <summary>Die Texte der Zeilen mit Nummer neu (Kontext und hinzugefügt) in ihrer Reihenfolge: die n-te trägt Nummer neu n.</summary>
    public string[] TexteMitNummerNeu()
    {
        return Zeilen.Where(zeile => zeile.StartsWith(' ') || zeile.StartsWith('+')).Select(zeile => zeile[1..]).ToArray();
    }

    /// <summary>Die Texte der Zeilen mit Nummer alt (Kontext und entfernt) in ihrer Reihenfolge: die m-te trägt Nummer alt m.</summary>
    public string[] TexteMitNummerAlt()
    {
        return Zeilen.Where(zeile => zeile.StartsWith(' ') || zeile.StartsWith('-')).Select(zeile => zeile[1..]).ToArray();
    }
}
