using GitReviewA.Aufruf;
using GitReviewA.Git;

namespace GitReviewA.Haken;

internal sealed class GitUebersichtsquelle(Commitzeilen commits, string arbeitsordner) : IUebersichtsquelle
{
    public Dateiuebersicht Lesen()
    {
        var hashes = new List<string>(commits.Anzahl);
        foreach (var commit in commits)
        {
            hashes.Add(commit.Hash);
        }
        return GitLeser.UebersichtLesen(new CommitHashes(hashes), arbeitsordner);
    }
}
