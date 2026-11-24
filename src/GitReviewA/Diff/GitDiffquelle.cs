using GitReviewA.Git;

namespace GitReviewA.Diff;

internal sealed class GitDiffquelle(string arbeitsordner) : IDiffquelle
{
    public string Lesen(string hash, Dateiaenderung datei, Diffumfang umfang)
    {
        var ausgabe = GitLeser.DiffLesen(hash, datei, umfang, arbeitsordner);
        return Diffaufbereitung.PatchAbErstemHunk(ausgabe);
    }

    public string AlsTextLesen(string hash, Dateiaenderung datei, Diffumfang umfang)
    {
        var ausgabe = GitLeser.DiffAlsTextLesen(hash, datei, umfang, arbeitsordner);
        return Diffaufbereitung.PatchAbErstemHunk(ausgabe);
    }

    public string BinaerGrund(string hash, Dateiaenderung datei)
    {
        var attribut = GitLeser.DiffAttributLesen(datei, arbeitsordner);
        return Diffaufbereitung.BinaerGrundAus(attribut);
    }
}
