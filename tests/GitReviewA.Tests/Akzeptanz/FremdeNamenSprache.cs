using System.Runtime.Versioning;
using GitReviewA.Diff;
using GitReviewA.Git;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Testsprache „Diff bei Name mit ungültigem Byte“ (R00013): Commits heißen wie in der User Story, Namen wie in der Dateiliste
/// (`a⟨0xFF⟩.sh` für `a\xFF.sh`). Darunter der Treiber, der den Interactor in-process ruft.
/// </summary>
[UnsupportedOSPlatform("windows")]
internal sealed class FremdeNamenSprache
{
    private readonly FremdeNamenRepo repo;
    private readonly DiffLesenTreiber treiber;

    private FremdeNamenSprache(FremdeNamenRepo repo, DiffLesenTreiber treiber)
    {
        this.repo = repo;
        this.treiber = treiber;
    }

    /// <summary>`gitreviewA <commits…>` im Repo, gestartet aus seiner Wurzel oder einem Unterordner.</summary>
    public static FremdeNamenSprache Aufruf(FremdeNamenRepo repo, string[] commits, string unterordner = "")
    {
        var startordner = Path.Combine(repo.Ordner, unterordner);
        Directory.CreateDirectory(startordner);
        var treiber = DiffLesenTreiber.Starten(startordner, commits.Select(repo.Hash));
        return new FremdeNamenSprache(repo, treiber);
    }

    /// <summary>Wie <see cref="Aufruf"/>, aber mit kleiner Ausgabegrenze für die Grenzprobe.</summary>
    public static FremdeNamenSprache AufrufMitGrenze(FremdeNamenRepo repo, string[] commits, Ausgabegrenze grenze)
    {
        var treiber = DiffLesenTreiber.Starten(repo.Ordner, commits.Select(repo.Hash), grenze);
        return new FremdeNamenSprache(repo, treiber);
    }

    /// <summary>Wie <see cref="Aufruf"/>, aber jeder Patch kommt aus <paramref name="diffquelle"/> statt aus git.</summary>
    public static FremdeNamenSprache AufrufMitDiffquelle(FremdeNamenRepo repo, string[] commits, IDiffquelle diffquelle)
    {
        var treiber = DiffLesenTreiber.Starten(repo.Ordner, commits.Select(repo.Hash), diffquelle);
        return new FremdeNamenSprache(repo, treiber);
    }

    public Dateiansicht Diff(string commit, string name)
    {
        return treiber.Lesen(repo.Hash(commit), name, ganzeDatei: false);
    }

    public Dateiansicht GanzeDatei(string commit, string name)
    {
        return treiber.Lesen(repo.Hash(commit), name, ganzeDatei: true);
    }

    public Dateiansicht AlsText(string commit, string name)
    {
        return treiber.Lesen(repo.Hash(commit), name, ganzeDatei: false, alsText: true);
    }

    public string[] Protokollzeilen()
    {
        return treiber.Protokollzeilen();
    }
}
