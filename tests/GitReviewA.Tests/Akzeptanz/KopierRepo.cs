using System.Runtime.Versioning;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>Repo K (Commits `k1`, `k2`) und Repo W (Commit `w` mit fremdem Namen) der User Story R00020, mit echtem git im Wegwerf-Ordner.</summary>
[UnsupportedOSPlatform("windows")]
internal sealed class KopierRepo : IDisposable
{
    public const string NameMitRichtungUndMarken = "u\u202E\u200B\U000E0041.txt";

    private readonly WegwerfRepo repo;
    private readonly Dictionary<string, string> hashNachName = new(StringComparer.Ordinal);

    private KopierRepo(WegwerfRepo repo)
    {
        this.repo = repo;
    }

    public string Ordner => repo.Ordner;

    public string Hash(string commit)
    {
        return hashNachName[commit];
    }

    public static KopierRepo K()
    {
        var k = new KopierRepo(WegwerfRepo.MitCommits());
        k.repo.SchreibeDatei("a.txt", "eins\nzwei\n");
        k.repo.SchreibeDatei("README.md", "Titel\n");
        k.Committe("k1", "Start", "2026-03-04T09:15:00+01:00");
        k.repo.SchreibeDatei("a.txt", "eins\nZWEI\ndrei\n");
        k.Committe("k2", "a ändern", "2026-03-05T18:30:00+01:00");
        return k;
    }

    public static KopierRepo W()
    {
        var w = new KopierRepo(WegwerfRepo.MitCommits());
        w.repo.SchreibeDatei(NameMitRichtungUndMarken, "x\n");
        w.Committe("w", "fremder Name", "2026-03-04T09:15:00+01:00");
        return w;
    }

    public void Dispose()
    {
        repo.Dispose();
    }

    private void Committe(string name, string betreff, string datum)
    {
        hashNachName[name] = repo.Committe(betreff, "Kim Beispiel", datum, string.Empty);
    }
}