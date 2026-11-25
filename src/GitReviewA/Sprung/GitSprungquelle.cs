using GitReviewA.Git;

namespace GitReviewA.Sprung;

/// <summary>
/// Der Arbeitsbaum als Sprungquelle: Dateisystemzugriff hinter <see cref="ISprungquelle"/>. Ein Symlink wird an seinem Endziel
/// beurteilt: führt es aus der Repositorywurzel hinaus, ist das <see cref="Sprungvorhandensein.VerlaesstWurzel"/> — auch wenn das
/// Ziel existiert; sonst zählt, ob das Endziel da ist. `File.Exists` allein genügt nicht: .NET meldet auch einen ins Leere
/// zeigenden Symlink als vorhanden.
/// </summary>
internal sealed class GitSprungquelle : ISprungquelle
{
    private readonly Ausgabegrenze grenze;

    public GitSprungquelle(string repositorywurzel) : this(repositorywurzel, Ausgabegrenze.Standard)
    {
    }

    public GitSprungquelle(string repositorywurzel, Ausgabegrenze grenze)
    {
        Repositorywurzel = repositorywurzel;
        this.grenze = grenze;
    }

    public string Repositorywurzel { get; }

    public bool IstGeaendertSeit(string hash, Dateiaenderung datei)
    {
        return GitLeser.ArbeitsbaumGeaendertLesen(hash, datei, Repositorywurzel, grenze);
    }

    public Sprungvorhandensein PruefeVorhandensein(string absoluterPfad)
    {
        var info = AlsDateiinfo(absoluterPfad);
        if (info is null)
        {
            return Sprungvorhandensein.Fehlt;
        }
        var istVerweis = info.LinkTarget is not null;
        if (istVerweis)
        {
            return VerweisZustand(info);
        }
        return DateiZustand(absoluterPfad);
    }

    private Sprungvorhandensein VerweisZustand(FileInfo info)
    {
        var endziel = info.ResolveLinkTarget(returnFinalTarget: true);
        if (endziel is null)
        {
            return Sprungvorhandensein.Fehlt;
        }
        var verlaesstDieWurzel = !LiegtInWurzel(endziel.FullName);
        if (verlaesstDieWurzel)
        {
            return Sprungvorhandensein.VerlaesstWurzel;
        }
        return DateiZustand(endziel.FullName);
    }

    private static Sprungvorhandensein DateiZustand(string pfad)
    {
        var istVorhanden = File.Exists(pfad);
        if (istVorhanden)
        {
            return Sprungvorhandensein.Vorhanden;
        }
        return Sprungvorhandensein.Fehlt;
    }

    /// <summary>Ein unsyntaktischer Pfad kann nicht außerhalb liegen; die Vorhandenprüfung meldet ihn dann als fehlend.</summary>
    private static FileInfo? AlsDateiinfo(string absoluterPfad)
    {
        try
        {
            return new FileInfo(absoluterPfad);
        }
        catch (Exception fehler) when (fehler is ArgumentException or PathTooLongException or NotSupportedException)
        {
            return null;
        }
    }

    private bool LiegtInWurzel(string pfad)
    {
        var wurzel = Path.TrimEndingDirectorySeparator(Path.GetFullPath(Repositorywurzel));
        var ziel = Path.GetFullPath(pfad);
        var istDieWurzelSelbst = ziel == wurzel;
        if (istDieWurzelSelbst)
        {
            return true;
        }
        var istWurzelverzeichnis = wurzel == Path.DirectorySeparatorChar.ToString();
        if (istWurzelverzeichnis)
        {
            return true;
        }
        return ziel.StartsWith(wurzel + Path.DirectorySeparatorChar, StringComparison.Ordinal);
    }
}
