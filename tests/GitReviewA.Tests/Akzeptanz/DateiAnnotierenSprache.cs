using System.Runtime.Versioning;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Testsprache „Datei annotieren“ (R00022): Commits heißen wie in der User Story, angemerkt wird ohne Zeile (`<Datei> (ganze Datei)`).
/// Darunter der Treiber, der den Interactor in-process ruft.
/// </summary>
[UnsupportedOSPlatform("windows")]
internal sealed class DateiAnnotierenSprache
{
    private readonly DiffRepo repo;
    private readonly DateiAnnotierenTreiber treiber;

    private DateiAnnotierenSprache(DiffRepo repo, DateiAnnotierenTreiber treiber)
    {
        this.repo = repo;
        this.treiber = treiber;
    }

    /// <summary>`gitreviewA <commits…>` im Repo.</summary>
    public static DateiAnnotierenSprache Aufruf(DiffRepo repo, string[] commits)
    {
        var treiber = DateiAnnotierenTreiber.Starten(repo.Ordner, commits.Select(repo.Hash));
        return new DateiAnnotierenSprache(repo, treiber);
    }

    /// <summary>Ab jetzt meldet die Übersicht die Stelle als gesperrt — eine feste Übersicht statt git (Kriterium 6).</summary>
    public void SperreAbJetzt(string commit, string gesperrterPfad, string sperrgrund, string lesbarerPfad)
    {
        treiber.SperreDurchFesteUebersicht(TestUebersichtsquelle.MitSperre(repo.Hash(commit), gesperrterPfad, sperrgrund, lesbarerPfad));
    }

    /// <summary>Eine Dateianmerkung anlegen: derselbe Request ohne `zeile`.</summary>
    public Anlegeantwort Annotiere(string commit, string datei, string text)
    {
        return treiber.LegeAn(repo.Hash(commit), datei, null, text);
    }

    /// <summary>Eine Zeilenanmerkung anlegen (zum Nebeneinander in Kriterium 2).</summary>
    public Anlegeantwort AnnotiereZeile(string commit, string datei, int nummerNeu, string text)
    {
        return treiber.LegeAn(repo.Hash(commit), datei, nummerNeu, text);
    }

    public Listeneintrag[] Anmerkungen()
    {
        return treiber.Liste();
    }

    public Listeneintrag Anmerkung(int nummer, string commit, string datei, string text)
    {
        return new Listeneintrag(nummer, repo.Hash(commit), datei, null, text);
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
