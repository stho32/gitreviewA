using GitReviewA.Git;

namespace GitReviewA.Diff;

internal sealed class GitDiffquelle(string arbeitsordner) : IDiffquelle
{
    public string Lesen(string hash, Dateiaenderung datei)
    {
        var ausgabe = GitLeser.DiffLesen(hash, datei, arbeitsordner);
        return Diffaufbereitung.PatchAbErstemHunk(ausgabe);
    }
}
