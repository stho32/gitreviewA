using GitReviewA.Git;

namespace GitReviewA.Dateien;

internal sealed class GitDateiquelle : IDateiquelle
{
    private readonly string arbeitsordner;
    private readonly Ausgabegrenze grenze;

    public GitDateiquelle(string arbeitsordner) : this(arbeitsordner, Ausgabegrenze.Standard)
    {
    }

    public GitDateiquelle(string arbeitsordner, Ausgabegrenze grenze)
    {
        this.arbeitsordner = arbeitsordner;
        this.grenze = grenze;
    }

    public Dateiaenderungen Lesen(string hash)
    {
        return GitLeser.DateienLesen(hash, arbeitsordner, grenze);
    }
}
