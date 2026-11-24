using GitReviewA.Aufruf;
using GitReviewA.Diff;
using GitReviewA.Git;

namespace GitReviewA.Zusammen;

internal sealed class GitZusammenquelle(Commitzeilen commits, string arbeitsordner) : IZusammenquelle
{
    public Elternfolge Elternfolge()
    {
        var hashes = new List<string>(commits.Anzahl);
        foreach (var commit in commits)
        {
            hashes.Add(commit.Hash);
        }
        return GitLeser.ElternfolgeLesen(new CommitHashes(hashes), arbeitsordner);
    }

    public Dateiaenderungen NettoDateien(string basis, string spitze)
    {
        return GitLeser.NettoDateienLesen(basis, spitze, arbeitsordner);
    }

    public string NettoDiff(string basis, string spitze, Dateiaenderung datei, Diffumfang umfang)
    {
        return GitLeser.NettoDiffLesen(basis, spitze, datei, umfang, arbeitsordner);
    }
}
