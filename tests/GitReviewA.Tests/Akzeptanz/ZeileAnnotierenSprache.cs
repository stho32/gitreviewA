using System.Runtime.Versioning;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Testsprache „Zeile annotieren“ (R00010): Commits heißen wie in der User Story, Zeilen tragen ihre Nummer neu (Stand nach dem Commit).
/// Darunter der Treiber, der den Interactor in-process ruft.
/// </summary>
[UnsupportedOSPlatform("windows")]
internal sealed class ZeileAnnotierenSprache
{
    private readonly DiffRepo repo;
    private readonly ZeileAnnotierenTreiber treiber;

    private ZeileAnnotierenSprache(DiffRepo repo, ZeileAnnotierenTreiber treiber)
    {
        this.repo = repo;
        this.treiber = treiber;
    }

    /// <summary>`gitreviewA <commits…>` im Repo.</summary>
    public static ZeileAnnotierenSprache Aufruf(DiffRepo repo, string[] commits)
    {
        var treiber = ZeileAnnotierenTreiber.Starten(repo.Ordner, commits.Select(repo.Hash));
        return new ZeileAnnotierenSprache(repo, treiber);
    }

    public Anlegeantwort Annotiere(string commit, string datei, int nummerNeu, string text)
    {
        return treiber.LegeAn(repo.Hash(commit), datei, nummerNeu, text);
    }

    public Anlegeantwort AnnotiereMitGekuerztemHash(string commit, string datei, int nummerNeu, string text)
    {
        return treiber.LegeAn(repo.Hash(commit)[..7], datei, nummerNeu, text);
    }

    public Listeneintrag[] Anmerkungen()
    {
        return treiber.Liste();
    }

    public Listeneintrag Anmerkung(int nummer, string commit, string datei, int nummerNeu, string text)
    {
        return new Listeneintrag(nummer, repo.Hash(commit), datei, nummerNeu, text);
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
