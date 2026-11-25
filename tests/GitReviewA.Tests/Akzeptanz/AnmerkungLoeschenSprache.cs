using System.Runtime.Versioning;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Testsprache „Anmerkung löschen“ (R00019): Commits heißen wie in der User Story, gelöscht wird über die stabile Nummer.
/// Darunter der Treiber, der Anlegen und Löschen in-process ruft; die Sperre einer Stelle lässt sich über eine feste Übersicht melden.
/// </summary>
[UnsupportedOSPlatform("windows")]
internal sealed class AnmerkungLoeschenSprache
{
    private readonly DiffRepo repo;
    private readonly AnmerkungLoeschenTreiber treiber;

    private AnmerkungLoeschenSprache(DiffRepo repo, AnmerkungLoeschenTreiber treiber)
    {
        this.repo = repo;
        this.treiber = treiber;
    }

    /// <summary>`gitreviewA <commits…>` im Repo.</summary>
    public static AnmerkungLoeschenSprache Aufruf(DiffRepo repo, string[] commits)
    {
        var treiber = AnmerkungLoeschenTreiber.Starten(repo.Ordner, commits.Select(repo.Hash));
        return new AnmerkungLoeschenSprache(repo, treiber);
    }

    /// <summary>Ab jetzt meldet die Übersicht die Stelle als gesperrt — eine feste Übersicht statt git (Kriterium 7).</summary>
    public void SperreAbJetzt(string commit, string gesperrterPfad, string sperrgrund, string lesbarerPfad)
    {
        treiber.SperreDurchFesteUebersicht(TestUebersichtsquelle.MitSperre(repo.Hash(commit), gesperrterPfad, sperrgrund, lesbarerPfad));
    }

    public Anlegeantwort LegeAn(string commit, string datei, int? zeile, string text)
    {
        return treiber.LegeAn(repo.Hash(commit), datei, zeile, text);
    }

    public Loeschantwort Loesche(int nummer)
    {
        return treiber.Loesche(nummer);
    }

    public Listeneintrag[] Anmerkungen()
    {
        return treiber.Liste();
    }

    public Listeneintrag Anmerkung(int nummer, string commit, string datei, int? zeile, string text)
    {
        return new Listeneintrag(nummer, repo.Hash(commit), datei, zeile, text);
    }

    public string Beenden()
    {
        return treiber.Beenden();
    }

    /// <summary>Der Abschnitt einer Anmerkung im Ergebnis, Format R00002.</summary>
    public string Ergebnisabschnitt(int position, string stelle, string commit, string zitat)
    {
        return $"## {position}. {stelle}\n\nCommit: {repo.Hash(commit)}\n\n{zitat}\n";
    }

    public string[] Protokollzeilen()
    {
        return treiber.Protokoll().Split('\n', StringSplitOptions.RemoveEmptyEntries);
    }

    public string Protokoll()
    {
        return treiber.Protokoll();
    }
}
