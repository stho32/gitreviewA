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
        var arbeitsordner = GitLeser.WurzelLesen(startordner);
        return Starten(startordner, hashes, new GitDiffquelle(arbeitsordner));
    }

    /// <summary>Wie <see cref="Starten(string, IEnumerable{string})"/>, aber mit einer kleinen Ausgabegrenze für die Grenzprobe.</summary>
    public static DiffLesenTreiber Starten(string startordner, IEnumerable<string> hashes, Ausgabegrenze ausgabegrenze)
    {
        var arbeitsordner = GitLeser.WurzelLesen(startordner);
        return Starten(startordner, hashes, new GitDiffquelle(arbeitsordner, ausgabegrenze));
    }

    /// <summary>Dateiliste aus dem echten git, Patches aus <paramref name="diffquelle"/> — für Fehler im Lesen, die git selbst nicht zeigt.</summary>
    public static DiffLesenTreiber Starten(string startordner, IEnumerable<string> hashes, IDiffquelle diffquelle)
    {
        var commits = GitLeser.Lesen(new CommitHashes(hashes), startordner);
        var arbeitsordner = GitLeser.WurzelLesen(startordner);
        var protokollziel = new StringWriter();
        var protokoll = new StderrProtokoll(protokollziel, TimeProvider.System, Protokollstufe.Debug);
        var dateien = new GemerkteDateiquelle(new GitDateiquelle(arbeitsordner));
        var interactor = new DiffLesenInteractor(commits, dateien, diffquelle, protokoll);
        return new DiffLesenTreiber(interactor, protokollziel);
    }

    public Dateiansicht Lesen(string hash, string pfad, bool ganzeDatei)
    {
        return Lesen(hash, pfad, ganzeDatei, alsText: false);
    }

    /// <summary>Wie <see cref="Lesen(string, string, bool)"/>, mit der Wahl „Als Text zeigen“ bei einer Binärdatei.</summary>
    public Dateiansicht Lesen(string hash, string pfad, bool ganzeDatei, bool alsText)
    {
        return Lesen(hash, pfad, ganzeDatei, alsText, Leerraum.Beachten);
    }

    /// <summary>Wie <see cref="Lesen(string, string, bool, bool)"/>, mit der Leerraum-Stellung des Umschalters (R00026).</summary>
    public Dateiansicht Lesen(string hash, string pfad, bool ganzeDatei, bool alsText, Leerraum leerraum)
    {
        var umfang = Diffumfang.Aenderungen;
        if (ganzeDatei)
        {
            umfang = Diffumfang.Ganz;
        }
        var ergebnis = interactor.Lesen(new Diffanfrage(hash, pfad, alsText, umfang, leerraum));
        return Dateiansicht.Aus(ergebnis);
    }

    public string[] Protokollzeilen()
    {
        return protokollziel.ToString().Split('\n', StringSplitOptions.RemoveEmptyEntries);
    }
}

/// <summary>
/// Was der Diff-Bereich aus einer Antwort zeigt, in Patch-Schreibweise: `Zeilen` ohne Abschnittsköpfe (` z01`, `-z03`, `+Z03`, `\ No newline …`),
/// `Ausgang` `gelesen`, `nicht gefunden`, `nicht lesbar` oder `name nicht lesbar`.
/// </summary>
internal sealed record Dateiansicht(string Ausgang, string? Pfad, string? Art, string[] Abschnittskoepfe, string[] Zeilen, string? Meldung = null)
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
            if (ergebnis.Ausgang == Diffausgang.NameNichtLesbar)
            {
                ausgang = "name nicht lesbar";
            }
            if (ergebnis.Ausgang == Diffausgang.ZuGross)
            {
                ausgang = "zu groß";
            }
            return new Dateiansicht(ausgang, null, null, [], [], ergebnis.Meldung);
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
        var zeilenMitNummerNeu = Zeilen.Where(zeile => zeile.StartsWith(' ') || zeile.StartsWith('+'));
        return zeilenMitNummerNeu.Select(zeile => zeile[1..]).ToArray();
    }

    /// <summary>Die Texte der Zeilen mit Nummer alt (Kontext und entfernt) in ihrer Reihenfolge: die m-te trägt Nummer alt m.</summary>
    public string[] TexteMitNummerAlt()
    {
        var zeilenMitNummerAlt = Zeilen.Where(zeile => zeile.StartsWith(' ') || zeile.StartsWith('-'));
        return zeilenMitNummerAlt.Select(zeile => zeile[1..]).ToArray();
    }
}
