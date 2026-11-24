using GitReviewA.Git;

namespace GitReviewA.Dateien;

internal sealed class GitDateiquelle(string arbeitsordner) : IDateiquelle
{
    public Dateiaenderungen Lesen(string hash)
    {
        return GitLeser.DateienLesen(hash, arbeitsordner);
    }
}
