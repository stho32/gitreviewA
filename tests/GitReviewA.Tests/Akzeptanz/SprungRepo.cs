using System.Runtime.Versioning;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Die Wegwerf-Repos der User Story zu R00021: **Repo S** (Commits `s1` „Start“, `s2` „Ändern“) und **Repo L** (Symlink `link.txt` auf
/// `/etc/hostname`). Gleicher Inhalt wie <c>e2e/treiber/sprung-repo.js</c>. Die Dateien mit fremden Zeichen (Repo F) legt
/// <see cref="FremdeNamenRepo"/> an, weil .NET sie nicht schreiben kann.
/// </summary>
[UnsupportedOSPlatform("windows")]
internal sealed class SprungRepo : IDisposable
{
    private const string Zeitpunkt = "2026-03-04T09:15:00+01:00";

    private readonly WegwerfRepo repo;
    private readonly Dictionary<string, string> hashNachName = new(StringComparer.Ordinal);

    private SprungRepo(WegwerfRepo repo)
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

    /// <summary>Repo S: `s1` legt fünf Dateien an, `s2` ändert `src/a.txt`, löscht `README.md` und hängt in `weg.txt` an.</summary>
    public static SprungRepo S()
    {
        var s = new SprungRepo(WegwerfRepo.MitCommits());
        s.Schreibe("README.md", "Zeile eins\nZeile zwei\n");
        s.Schreibe("src/a.txt", "a1\na2\na3\n");
        s.Schreibe("Ordner mit Leerzeichen/datei#1.txt", "x\ny\n");
        s.Schreibe("prozent%25.txt", "z\n");
        s.Schreibe("weg.txt", "w1\nw2\n");
        s.Committe("s1", "Start");
        s.Schreibe("src/a.txt", "a1\nA2\na3\na4\n");
        s.Git("rm", "-q", "README.md");
        s.Schreibe("weg.txt", "w1\nw2\nw3\n");
        s.Committe("s2", "Ändern");
        return s;
    }

    /// <summary>Repo L: ein Commit `l` fügt `inhalt.txt` und den Symlink `link.txt` auf `/etc/hostname` hinzu.</summary>
    public static SprungRepo L()
    {
        var l = new SprungRepo(WegwerfRepo.MitCommits());
        l.Schreibe("inhalt.txt", "eins\n");
        File.CreateSymbolicLink(Path.Combine(l.Ordner, "link.txt"), "/etc/hostname");
        l.Committe("l", "Symlink");
        return l;
    }

    private void Schreibe(string pfad, string inhalt)
    {
        repo.SchreibeDatei(pfad, inhalt);
    }

    private void Committe(string name, string betreff)
    {
        hashNachName[name] = repo.Committe(betreff, "Anna Beispiel", Zeitpunkt, "");
    }
}
