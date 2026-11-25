using GitReviewA.Fremdtext;
using GitReviewA.Git;

namespace GitReviewA.Bild;

/// <summary>
/// Adapter auf <see cref="GitStart"/>: `vorher` ist die Fassung des ersten Elternteils (`<hash>^`) an ihrem alten Pfad,
/// `nachher` die des Commits an seinem neuen Pfad. Ein Name mit Rohbytes geht über den stdin-Weg an git, nie als Argument.
/// </summary>
internal sealed class GitBildquelle : IBildquelle
{
    private readonly string arbeitsordner;
    private readonly Ausgabegrenze grenze;

    public GitBildquelle(string arbeitsordner) : this(arbeitsordner, Ausgabegrenze.Standard)
    {
    }

    public GitBildquelle(string arbeitsordner, Ausgabegrenze grenze)
    {
        this.arbeitsordner = arbeitsordner;
        this.grenze = grenze;
    }

    public byte[] Lesen(string hash, Dateiaenderung datei, Bildseite seite)
    {
        var istVorher = seite == Bildseite.Vorher;
        var revision = hash;
        var pfad = datei.Pfad;
        var rohpfad = datei.Rohpfad;
        if (istVorher)
        {
            revision = $"{hash}^";
            if (datei.AlterPfad is not null)
            {
                pfad = datei.AlterPfad;
            }
            if (datei.RohAlterPfad is not null)
            {
                rohpfad = datei.RohAlterPfad;
            }
        }
        return GitLeser.BlobLesen(revision, pfad, rohpfad, arbeitsordner, grenze);
    }
}
