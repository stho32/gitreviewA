using GitReviewA.Aufruf;
using GitReviewA.Git;

namespace GitReviewA.Haken;

internal sealed class GitUebersichtsquelle : IUebersichtsquelle
{
    private readonly Commitzeilen commits;
    private readonly string arbeitsordner;
    private readonly Ausgabegrenze grenze;

    public GitUebersichtsquelle(Commitzeilen commits, string arbeitsordner) : this(commits, arbeitsordner, Ausgabegrenze.Standard)
    {
    }

    public GitUebersichtsquelle(Commitzeilen commits, string arbeitsordner, Ausgabegrenze grenze)
    {
        this.commits = commits;
        this.arbeitsordner = arbeitsordner;
        this.grenze = grenze;
    }

    public Dateiuebersicht Lesen()
    {
        var hashes = new List<string>(commits.Anzahl);
        foreach (var commit in commits)
        {
            hashes.Add(commit.Hash);
        }
        return GitLeser.UebersichtLesen(new CommitHashes(hashes), arbeitsordner, grenze);
    }
}
