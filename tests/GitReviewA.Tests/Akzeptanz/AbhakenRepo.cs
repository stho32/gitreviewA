using System.Diagnostics;
using System.Runtime.Versioning;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Die Wegwerf-Repos der User Story R00011 mit Commits unter ihren Namen: Vorbereitung (`p`, `q`, `r` aus R00003), `y` (Name mit LF und U+202E),
/// `g` (2 000 Dateien), `u` (Namen aus ungültigem UTF-8). Gleicher Inhalt wie <c>e2e/treiber/wegwerf-repo.js</c>.
/// </summary>
[UnsupportedOSPlatform("windows")]
internal sealed class AbhakenRepo : IDisposable
{
    public const string NameMitZeilenumbruchUndRichtungszeichen = "ab\ncd‮.txt";

    private readonly WegwerfRepo repo;
    private readonly Dictionary<string, string> hashNachName = new(StringComparer.Ordinal);

    private AbhakenRepo(WegwerfRepo repo)
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

    /// <summary>`p` fügt `README.md`, `alt.txt`, `src/a.txt`, `src/b.txt` hinzu; `q` benennt `README.md` in `LIESMICH.md` um, löscht `alt.txt`, fügt `logo.bin` hinzu, ändert `src/b.txt`; `r` ist leer.</summary>
    public static AbhakenRepo Vorbereitung()
    {
        var v = new AbhakenRepo(WegwerfRepo.MitCommits());
        v.repo.SchreibeDatei("README.md", "Zeile 1\nZeile 2\n");
        v.repo.SchreibeDatei("src/a.txt", "a\nb\nc\n");
        v.repo.SchreibeDatei("src/b.txt", "x\ny\n");
        v.repo.SchreibeDatei("alt.txt", "1\n2\n3\n4\n");
        v.Committe("p", "Start", "2026-03-04T09:15:00+01:00");
        v.Git("mv", "README.md", "LIESMICH.md");
        File.Delete(Path.Combine(v.Ordner, "alt.txt"));
        v.repo.SchreibeDatei("src/b.txt", "x\nY\nz\n");
        File.WriteAllBytes(Path.Combine(v.Ordner, "logo.bin"), [0, 1, 2, 3, 0, 255]);
        v.Committe("q", "Dateien ändern", "2026-03-05T18:30:00+01:00");
        v.Committe("r", "Nichts", "2026-03-06T08:00:00+01:00");
        return v;
    }

    /// <summary>Vorbereitung und ein Commit `fremd`, der im Repo liegt, aber nicht zur Auswahl `p q r` gehört.</summary>
    public static AbhakenRepo VorbereitungMitFremdemCommit()
    {
        var v = Vorbereitung();
        v.repo.SchreibeDatei("fremd.txt", "f\n");
        v.Committe("fremd", "Nicht ausgewählt", "2026-03-07T08:00:00+01:00");
        return v;
    }

    /// <summary>`y` fügt die Datei <see cref="NameMitZeilenumbruchUndRichtungszeichen"/> hinzu, auf Wunsch dazu `b.txt` (ein zweiter Haken, damit der Name als ungeprüft erscheinen kann).</summary>
    public static AbhakenRepo Y(bool mitKontrolldatei = false)
    {
        var y = new AbhakenRepo(WegwerfRepo.MitCommits());
        y.repo.SchreibeDatei(NameMitZeilenumbruchUndRichtungszeichen, "x\n");
        if (mitKontrolldatei)
        {
            y.repo.SchreibeDatei("b.txt", "b\n");
        }
        y.Committe("y", "Fremder Name", "2026-03-04T09:15:00+01:00");
        return y;
    }

    /// <summary>`g` fügt `viele/datei-0001.txt` … `viele/datei-2000.txt` mit je einer Zeile hinzu.</summary>
    public static AbhakenRepo G()
    {
        var g = new AbhakenRepo(WegwerfRepo.MitCommits());
        foreach (var nummer in Enumerable.Range(1, 2000))
        {
            g.repo.SchreibeDatei($"viele/datei-{nummer:D4}.txt", $"Zeile {nummer}\n");
        }
        g.Committe("g", "2000 Dateien", "2026-03-04T09:15:00+01:00");
        return g;
    }

    /// <summary>
    /// `u` fügt `f\xFF.txt`, `f\xFE.txt` (ungültiges UTF-8) und `g.txt` hinzu; auf Wunsch statt `f\xFE.txt` eine Datei mit dem
    /// Doppelgänger-Namen <paramref name="doppelgaenger"/> in gültigem UTF-8 (etwa wörtlich `f⟨0xFF⟩.txt` oder `f\uFFFD.txt`).
    /// Die Namen aus fremden Bytes verlassen den Arbeitsordner nach dem Commit wieder: .NET kann sie nicht löschen.
    /// </summary>
    public static AbhakenRepo U(string? doppelgaenger = null)
    {
        byte[] nameMitFF = [(byte)'f', 0xFF, (byte)'.', (byte)'t', (byte)'x', (byte)'t'];
        byte[] nameMitFE = [(byte)'f', 0xFE, (byte)'.', (byte)'t', (byte)'x', (byte)'t'];
        var u = new AbhakenRepo(WegwerfRepo.MitCommits());
        var bytenamen = new List<byte[]> { nameMitFF };
        if (doppelgaenger is null)
        {
            bytenamen.Add(nameMitFE);
        }
        else
        {
            u.repo.SchreibeDatei(doppelgaenger, "d\n");
        }
        foreach (var name in bytenamen)
        {
            u.Python("open(bytes.fromhex(sys.argv[1]), 'wb').write(b'x\\n')", name);
        }
        u.repo.SchreibeDatei("g.txt", "g\n");
        u.Committe("u", "Namen aus fremden Bytes", "2026-03-04T09:15:00+01:00");
        foreach (var name in bytenamen)
        {
            u.Python("os.remove(bytes.fromhex(sys.argv[1]))", name);
        }
        return u;
    }

    /// <summary>.NET legt nur Namen in gültigem UTF-8 an; die Bytes behandelt deshalb python3 wie in der Abnahme-Probe.</summary>
    private void Python(string anweisung, byte[] name)
    {
        var start = new ProcessStartInfo("python3") { WorkingDirectory = Ordner };
        start.ArgumentList.Add("-I");
        start.ArgumentList.Add("-c");
        start.ArgumentList.Add("import os, sys; " + anweisung);
        start.ArgumentList.Add(Convert.ToHexString(name));
        using var prozess = Process.Start(start)!;
        prozess.WaitForExit();
        var istGescheitert = prozess.ExitCode != 0;
        if (istGescheitert)
        {
            throw new InvalidOperationException($"python3 endete mit {prozess.ExitCode}: {anweisung}");
        }
    }

    private void Committe(string name, string betreff, string datum)
    {
        hashNachName[name] = repo.Committe(betreff, "Anna Beispiel", datum, "");
    }
}
