using System.Runtime.Versioning;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Die Wegwerf-Repos der User Story zu R00012/R00015: **Repo Z** (Commits `z1` Wurzel, `z2`, `z3`; `z1 z2 z3` ist eine lückenlose Kette,
/// `z1 z3` nicht) und ein Repo mit einer Umbenennung (`z1` legt `alt.txt` an, `u` benennt sie in `neu.txt` um und ändert sie).
/// Die Commits tragen gestaffelte Zeiten, damit „jüngster Commit“ eindeutig ist.
/// </summary>
[UnsupportedOSPlatform("windows")]
internal sealed class ZusammenRepo : IDisposable
{
    private readonly WegwerfRepo repo;
    private readonly Dictionary<string, string> hashNachName = new(StringComparer.Ordinal);
    private readonly List<string> reihenfolge = [];
    private int weitereCommits;

    private ZusammenRepo(WegwerfRepo repo)
    {
        this.repo = repo;
    }

    public string Ordner => repo.Ordner;

    public string Hash(string commit)
    {
        return hashNachName[commit];
    }

    public string Git(params string[] argumente)
    {
        return repo.Git(argumente);
    }

    public void Dispose()
    {
        repo.Dispose();
    }

    /// <summary>Repo Z: `z1` „Start“ (`README.md` `Lager`/`Beispiel`, `src/a.txt` `eins`/`zwei`/`drei`), `z2` „a ändern, b neu“, `z3` „a und b ändern“.</summary>
    public static ZusammenRepo Z()
    {
        var z = new ZusammenRepo(WegwerfRepo.MitCommits());
        z.Schreibe("README.md", "Lager\nBeispiel\n");
        z.Schreibe("src/a.txt", "eins\nzwei\ndrei\n");
        z.Committe("z1", "Start");
        z.Schreibe("src/a.txt", "eins\nZWEI\ndrei\n");
        z.Schreibe("src/b.txt", "x\ny\n");
        z.Committe("z2", "a ändern, b neu");
        z.Schreibe("src/a.txt", "eins\nZWEI\ndrei\nvier\n");
        z.Schreibe("src/b.txt", "x\nY\n");
        z.Committe("z3", "a und b ändern");
        return z;
    }

    /// <summary>Repo der Umbenennung: `z1` legt `alt.txt` an, `u` benennt sie in `neu.txt` um und ändert die zweite Zeile.</summary>
    public static ZusammenRepo Umbenennung()
    {
        var z = new ZusammenRepo(WegwerfRepo.MitCommits());
        z.Schreibe("alt.txt", "a1\na2\na3\n");
        z.Committe("z1", "Start");
        z.Git("mv", "alt.txt", "neu.txt");
        z.Schreibe("neu.txt", "a1\nA2\na3\n");
        z.Committe("u", "umbenannt und geändert");
        return z;
    }

    /// <summary>Das Lastprofil der Vision: 200 Commits, davon einer mit 2 000 Dateien, dazu eine Datei mit 20 000 Zeilen.</summary>
    public static ZusammenRepo Gross()
    {
        var z = new ZusammenRepo(WegwerfRepo.MitCommits());
        for (var nummer = 1; nummer <= 2000; nummer++)
        {
            z.Schreibe($"viele/datei-{nummer:D4}.txt", $"Zeile {nummer}\n");
        }
        z.Schreibe("gross.txt", string.Concat(Enumerable.Range(1, 20000).Select(nummer => $"zeile {nummer:D5}\n")));
        z.Committe("g1", "2 000 Dateien");
        for (var nummer = 1; nummer <= 199; nummer++)
        {
            z.Leerer($"leer-{nummer:D3}");
        }
        return z;
    }

    /// <summary>Alle Commitnamen in der Reihenfolge der Anlage.</summary>
    public string[] Commitnamen()
    {
        return reihenfolge.ToArray();
    }

    private void Schreibe(string pfad, string inhalt)
    {
        repo.SchreibeDatei(pfad, inhalt);
    }

    /// <summary>Für Tests: eine weitere Datei im Arbeitsordner (nicht committet).</summary>
    public void LegeDateiAn(string pfad, string inhalt)
    {
        repo.SchreibeDatei(pfad, inhalt);
    }

    private void Committe(string name, string betreff)
    {
        weitereCommits++;
        var zeitpunkt = new DateTimeOffset(2026, 3, 4, 9, 15, 0, TimeSpan.FromHours(1)).AddMinutes(weitereCommits);
        Merke(name, repo.Committe(betreff, "Anna Beispiel", zeitpunkt.ToString("yyyy-MM-ddTHH:mm:sszzz"), ""));
    }

    private void Leerer(string name)
    {
        Merke(name, repo.LeererCommit($"Leer {name}"));
    }

    private void Merke(string name, string hash)
    {
        hashNachName[name] = hash;
        reihenfolge.Add(name);
    }
}
