using GitReviewA.Git;

namespace GitReviewA.Diff;

internal sealed class GitDiffquelle : IDiffquelle
{
    private readonly string arbeitsordner;
    private readonly Ausgabegrenze grenze;

    public GitDiffquelle(string arbeitsordner) : this(arbeitsordner, Ausgabegrenze.Standard)
    {
    }

    public GitDiffquelle(string arbeitsordner, Ausgabegrenze grenze)
    {
        this.arbeitsordner = arbeitsordner;
        this.grenze = grenze;
    }

    public string Lesen(string hash, Dateiaenderung datei, Diffumfang umfang, Leerraum leerraum)
    {
        var ausgabe = GitLeser.DiffLesen(hash, datei, umfang, arbeitsordner, grenze, leerraum);
        return Diffaufbereitung.PatchAbErstemHunk(ausgabe);
    }

    public string AlsTextLesen(string hash, Dateiaenderung datei, Diffumfang umfang, Leerraum leerraum)
    {
        var ausgabe = GitLeser.DiffAlsTextLesen(hash, datei, umfang, arbeitsordner, grenze, leerraum);
        return Diffaufbereitung.PatchAbErstemHunk(ausgabe);
    }

    public string BinaerGrund(string hash, Dateiaenderung datei)
    {
        var attribut = GitLeser.DiffAttributLesen(datei, arbeitsordner);
        return Diffaufbereitung.BinaerGrundAus(attribut);
    }
}
