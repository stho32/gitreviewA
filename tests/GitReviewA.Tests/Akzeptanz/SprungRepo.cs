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

    /// <summary>Repo M: `m1` legt `verzeichnis/passwd` an, `m2` ersetzt `verzeichnis` durch einen Verweis auf `/etc` (Commit A und B der Probe).</summary>
    public static SprungRepo M()
    {
        return MitVerzeichnisverweis("/etc");
    }

    /// <summary>Repo M, aber der Verweis bleibt in der Wurzel: `verzeichnis` zeigt auf das Verzeichnis `echt` mit demselben Inhalt.</summary>
    public static SprungRepo MInDerWurzel()
    {
        return MitVerzeichnisverweis("echt");
    }

    /// <summary>
    /// `m1` legt `verzeichnis/passwd` an, `m2` ersetzt `verzeichnis` durch einen Verweis auf <paramref name="verweisziel"/>. Das
    /// Verzeichnis `echt` trägt denselben Inhalt in der Wurzel: die beiden Repos der Probe unterscheiden sich nur im Verweisziel.
    /// </summary>
    private static SprungRepo MitVerzeichnisverweis(string verweisziel)
    {
        var m = new SprungRepo(WegwerfRepo.MitCommits());
        m.Schreibe("verzeichnis/passwd", "root:x:0:0\n");
        m.Committe("m1", "Datei im Verzeichnis");
        m.Git("rm", "-q", "-r", "verzeichnis");
        m.Schreibe("echt/passwd", "root:x:0:0\n");
        File.CreateSymbolicLink(Path.Combine(m.Ordner, "verzeichnis"), verweisziel);
        m.Committe("m2", "Verzeichnis als Verweis");
        return m;
    }

    /// <summary>
    /// Repo W: ein Commit `w` legt `😀.txt` (U+1F600, ein Codepunkt außerhalb der Grundebene) und `\uFFFD\uFFFD.txt` (zwei Ersatzzeichen)
    /// an — sichtbar verschiedene Namen, die bei der Kodierung je UTF-16-Codeeinheit dasselbe Ziel ergaben.
    /// </summary>
    public static SprungRepo W()
    {
        var w = new SprungRepo(WegwerfRepo.MitCommits());
        w.Schreibe("\U0001F600.txt", "eins\n");
        w.Schreibe("\uFFFD\uFFFD.txt", "zwei\n");
        w.Committe("w", "Astrales Zeichen");
        return w;
    }

    public static readonly string[] Markerdateien = ["marker-extern", "marker-textconv", "marker-command"];

    /// <summary>
    /// Repo F der Story: ein Commit `f` fügt `g.txt`, `f&lt;0xFF&gt;.txt` (Rohbyte) und `u&lt;U+202E&gt;.txt` hinzu; die beiden fremden
    /// Namen verlassen den Arbeitsordner danach wieder, damit er sich löschen lässt. Angelegt über bash (<see cref="FremdeNamenRepo"/>).
    /// </summary>
    public const string SkriptFremdeNamen = """
        set -e
        printf 'eins\n' > g.txt
        printf 'roh\n' > $'f\xff.txt'
        printf 'richtung\n' > $'u\xe2\x80\xae.txt'
        git add -A && git commit -q -m "FremdeNamen"
        rm -f -- $'f\xff.txt'
        """;

    /// <summary>Repo S mit `core.fsmonitor` auf ein Marker-Skript (liest der neue Lesepfad den Index, startet es).</summary>
    public static SprungRepo SMitFsmonitor()
    {
        var s = S();
        s.Git("config", "core.fsmonitor", s.MarkerSkript("marker-fsmonitor"));
        return s;
    }

    /// <summary>Repo S mit drei Diff-Programmen in der Konfiguration und `.gitattributes` `*.txt diff=marker` (Marker-Probe).</summary>
    public static SprungRepo SMitDiffProgrammen()
    {
        var s = S();
        s.Git("config", "diff.external", s.MarkerSkript("marker-extern"));
        s.Git("config", "diff.marker.textconv", s.MarkerSkript("marker-textconv"));
        s.Git("config", "diff.marker.command", s.MarkerSkript("marker-command"));
        s.Schreibe(".gitattributes", "*.txt diff=marker\n");
        return s;
    }

    /// <summary>Repo S mit Einstellungen, die Kontext, Leerzeilen und Farben der Ausgabe von git verändern.</summary>
    public static SprungRepo SMitFremdenEinstellungen()
    {
        var s = S();
        s.Git("config", "diff.context", "0");
        s.Git("config", "diff.suppressBlankEmpty", "true");
        s.Git("config", "color.ui", "always");
        return s;
    }

    public string[] VorhandeneMarker()
    {
        return Markerdateien.Where(marker => File.Exists(Path.Combine(Ordner, marker))).ToArray();
    }

    private string MarkerSkript(string marker)
    {
        var skript = Path.Combine(Ordner, ".git", $"{marker}.sh");
        File.WriteAllText(skript, $"#!/bin/sh\ntouch '{Path.Combine(Ordner, marker)}'\ncat \"$1\" 2>/dev/null\n");
        File.SetUnixFileMode(skript, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        return skript;
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
