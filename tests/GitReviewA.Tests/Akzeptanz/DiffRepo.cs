using System.Runtime.Versioning;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Die Wegwerf-Repos der User Stories zu R00004 und R00008, mit Commits unter ihren Namen aus der Story (A: p, q, s; M: m; R: r1, r2; U: u, v).
/// Gleicher Inhalt wie <c>e2e/treiber/diff-repos.js</c>.
/// </summary>
[UnsupportedOSPlatform("windows")]
internal sealed class DiffRepo : IDisposable
{
    private const string Zeitpunkt = "2026-03-04T09:15:00+01:00";

    private readonly WegwerfRepo repo;
    private readonly Dictionary<string, string> hashNachName = new(StringComparer.Ordinal);

    private DiffRepo(WegwerfRepo repo)
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

    /// <summary>Repo A: `p` „Start“, `q` „Dateien ändern“, `s` „Seltsame Namen“.</summary>
    public static DiffRepo A()
    {
        var a = new DiffRepo(WegwerfRepo.MitCommits());
        a.Schreibe("README.md", "Titel\nText\n");
        a.Schreibe("src/b.txt", "eins\nzwei\n");
        a.Schreibe("lang.txt", ZeilenZ01BisZ20());
        a.Schreibe("alt.txt", "a1\na2\na3\na4\n");
        a.Schreibe("ende.txt", "a");
        a.Schreibe("k.txt", "oben\n\nunten\n");
        a.Committe("p", "Start");
        a.Schreibe("src/b.txt", "eins\nZWEI\ndrei\n");
        a.Schreibe("lang.txt", ZeilenZ01BisZ20().Replace("z03\n", "Z03\n").Replace("z18\n", ""));
        File.Delete(Path.Combine(a.Ordner, "alt.txt"));
        File.Move(Path.Combine(a.Ordner, "README.md"), Path.Combine(a.Ordner, "LIESMICH.md"));
        a.Schreibe("ende.txt", "a\n");
        a.Schreibe("k.txt", "oben\n\nUNTEN\n");
        a.Schreibe("breit.txt", $"kurz\n{string.Concat(Enumerable.Repeat("0123456789", 30))}\n");
        a.Schreibe("fremd.txt", "<img src=x onerror=alert(1)>\n<b>fett</b>\na‮b\n");
        File.WriteAllBytes(Path.Combine(a.Ordner, "logo.bin"), [0x41, 0, 0x42, 0, 1, 2]);
        a.Committe("q", "Dateien ändern");
        a.Schreibe("--output=pwn", "x\n");
        a.Schreibe(":(glob)*.txt", "y\n");
        a.Schreibe("c.txt", "z\n");
        a.Committe("s", "Seltsame Namen");
        return a;
    }

    /// <summary>Repo A mit drei Diff-Programmen, die je eine Markerdatei im Repo anlegen, und Einstellungen, die Kontext, Leerzeilen und Farben verändern.</summary>
    public static DiffRepo AMitDiffProgrammenUndFremdenEinstellungen()
    {
        var a = A();
        a.Git("config", "diff.external", a.MarkerSkript("marker-extern"));
        a.Git("config", "diff.marker.textconv", a.MarkerSkript("marker-textconv"));
        a.Git("config", "diff.marker.command", a.MarkerSkript("marker-command"));
        a.Schreibe(".gitattributes", "*.txt diff=marker\n");
        a.Git("config", "diff.context", "0");
        a.Git("config", "diff.suppressBlankEmpty", "true");
        a.Git("config", "color.ui", "always");
        return a;
    }

    public static readonly string[] Markerdateien = ["marker-extern", "marker-textconv", "marker-command"];

    public string[] VorhandeneMarker()
    {
        return Markerdateien.Where(marker => File.Exists(Path.Combine(Ordner, marker))).ToArray();
    }

    /// <summary>Repo M: `c1`, Zweig `feature` mit `f.txt`, `c2` mit `g.txt` auf main, `m` = Merge von `feature`.</summary>
    public static DiffRepo M()
    {
        var m = new DiffRepo(WegwerfRepo.MitCommits());
        m.Schreibe("base.txt", "basis\n");
        m.Committe("c1", "c1");
        m.Git("switch", "-q", "-c", "feature");
        m.Schreibe("f.txt", "neu\n");
        m.Committe("feature", "Feature");
        m.Git("switch", "-q", "main");
        m.Schreibe("g.txt", "haupt\n");
        m.Committe("c2", "c2");
        m.Git("merge", "-q", "--no-ff", "feature", "-m", "Merge");
        m.hashNachName["m"] = m.Git("rev-parse", "HEAD");
        return m;
    }

    /// <summary>Repo R: `r1` fügt `u.txt` (`l1` … `l5`) hinzu, `r2` benennt sie in `v.txt` um und ändert `l3` zu `L3`.</summary>
    public static DiffRepo R()
    {
        var r = new DiffRepo(WegwerfRepo.MitCommits());
        r.Schreibe("u.txt", "l1\nl2\nl3\nl4\nl5\n");
        r.Committe("r1", "r1");
        File.Delete(Path.Combine(r.Ordner, "u.txt"));
        r.Schreibe("v.txt", "l1\nl2\nL3\nl4\nl5\n");
        r.Committe("r2", "r2");
        return r;
    }

    /// <summary>Repo U: `u` mit `gross.txt` aus 20 000 Zeilen, `v` ändert darin `zeile 10000` zu `geändert 10000`.</summary>
    public static DiffRepo U()
    {
        var u = new DiffRepo(WegwerfRepo.MitCommits());
        var zeilen = Enumerable.Range(1, 20000).Select(nummer => $"zeile {nummer:D5}\n");
        var gross = string.Concat(zeilen);
        u.Schreibe("gross.txt", gross);
        u.Committe("u", "20 000 Zeilen");
        u.Schreibe("gross.txt", gross.Replace("zeile 10000\n", "geändert 10000\n"));
        u.Committe("v", "Eine Zeile in 20 000");
        return u;
    }

    /// <summary>Unsichtbare Zeichen in Dateinamen (Befund Security-Review #17): je Zeichen eine Datei `x<Zeichen>y.txt`, dazu `a.txt` als Kontrolle.</summary>
    public static readonly string[] UnsichtbareZeichenInNamen = ["\u202E", "\u2066", "\u061C", "\u200E", "\u200B", "\uFEFF", "\U000E0041"];

    /// <summary>Repo N: `n` mit `a.txt` und den Dateien aus <see cref="UnsichtbareZeichenInNamen"/>.</summary>
    public static DiffRepo N()
    {
        var n = new DiffRepo(WegwerfRepo.MitCommits());
        n.Schreibe("a.txt", "a\n");
        foreach (var zeichen in UnsichtbareZeichenInNamen)
        {
            n.Schreibe($"x{zeichen}y.txt", "inhalt\n");
        }
        n.Committe("n", "Unsichtbare Namen");
        return n;
    }

    private static string ZeilenZ01BisZ20()
    {
        return string.Concat(Enumerable.Range(1, 20).Select(nummer => $"z{nummer:D2}\n"));
    }

    private void Schreibe(string pfad, string inhalt)
    {
        repo.SchreibeDatei(pfad, inhalt);
    }

    private void Committe(string name, string betreff)
    {
        hashNachName[name] = repo.Committe(betreff, "Anna Beispiel", Zeitpunkt, "");
    }

    private string MarkerSkript(string marker)
    {
        var skript = Path.Combine(Ordner, ".git", $"{marker}.sh");
        File.WriteAllText(skript, $"#!/bin/sh\ntouch '{Path.Combine(Ordner, marker)}'\ncat \"$1\" 2>/dev/null\n");
        File.SetUnixFileMode(skript, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        return skript;
    }
}
