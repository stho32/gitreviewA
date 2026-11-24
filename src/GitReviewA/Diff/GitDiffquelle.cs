using GitReviewA.Git;

namespace GitReviewA.Diff;

internal sealed class GitDiffquelle(string arbeitsordner) : IDiffquelle
{
    public string Lesen(string hash, Dateiaenderung datei)
    {
        var ausgabe = GitLeser.DiffLesen(hash, datei, arbeitsordner);
        return Diffaufbereitung.PatchAbErstemHunk(ausgabe);
    }

    public string AlsTextLesen(string hash, Dateiaenderung datei)
    {
        var ausgabe = GitLeser.DiffAlsTextLesen(hash, datei, arbeitsordner);
        return Diffaufbereitung.PatchAbErstemHunk(ausgabe);
    }

    public string BinaerGrund(string hash, Dateiaenderung datei)
    {
        var attribut = GitLeser.DiffAttributLesen(datei.Pfad, arbeitsordner);
        return Diffaufbereitung.BinaerGrundAus(attribut);
    }
}
