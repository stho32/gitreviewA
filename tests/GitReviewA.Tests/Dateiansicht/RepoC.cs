using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Dateiansicht;

/// <summary>
/// Repo C der User Story R00046: `c1` mit `sql/a.sql` (`SELECT 1;`), `sql/gross.bin` (Null-Byte), Ordner `sql/alt/`, Link
/// `link.sql` → `/etc/hostname`, Submodul-Eintrag `sub`, `x⟨U+202E⟩.sql`; `c2` ändert `sql/a.sql`; der Arbeitsbaum danach noch
/// einmal geändert (nicht committet). Dazu die Namen der Angriffsmatrix: eine ausführbare Datei, eine Datei `cafe:x.sql` und
/// die Blobs `f\xFF.sql` (rohes Byte) und `f\uFFFD.sql` (echtes Ersatzzeichen) für L1/N6.
/// </summary>
internal sealed class RepoC : IDisposable
{
    /// <summary>Der leere Baum als Submodul-Ziel (wie im Skript der User Story).</summary>
    public const string Leerbaum = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

    private readonly WegwerfRepo repo;

    private RepoC(WegwerfRepo repo, string c1, string c2)
    {
        this.repo = repo;
        C1 = c1;
        C2 = c2;
    }

    public string Ordner => repo.Ordner;

    public string C1 { get; }

    public string C2 { get; }

    public string Pfad(string name)
    {
        return Path.Combine(repo.Ordner, name);
    }

    public string Git(params string[] argumente)
    {
        return repo.Git(argumente);
    }

    public static RepoC Anlegen()
    {
        var repo = WegwerfRepo.OhneCommits();
        try
        {
            Directory.CreateDirectory(Path.Combine(repo.Ordner, "sql", "alt"));
            Directory.CreateDirectory(Path.Combine(repo.Ordner, "bin"));
            File.WriteAllText(Path.Combine(repo.Ordner, "sql", "a.sql"), "SELECT 1;\n");
            File.WriteAllText(Path.Combine(repo.Ordner, "sql", "alt", "b.sql"), "x\n");
            File.WriteAllBytes(Path.Combine(repo.Ordner, "sql", "gross.bin"), [(byte)'A', 0x00, (byte)'B']);
            File.WriteAllText(Path.Combine(repo.Ordner, "bin", "run.sh"), "#!/bin/sh\necho hallo\n");
            LegUnixAusfuehrbar(Path.Combine(repo.Ordner, "bin", "run.sh"));
            File.CreateSymbolicLink(Path.Combine(repo.Ordner, "link.sql"), "/etc/hostname");
            File.WriteAllText(Path.Combine(repo.Ordner, "x\u202e.sql"), "SELECT 9;\n");
            File.WriteAllText(Path.Combine(repo.Ordner, "cafe:x.sql"), "SELECT 'cafe';\n");
            LegeRohbyteNamen(repo.Ordner);
            repo.Git("add", "-A");
            repo.Git("update-index", "--add", "--cacheinfo", $"160000,{Leerbaum},sub");
            var c1 = repo.CommitteIndex("c1", "Alex Beispiel", "2026-01-01T10:00:00");
            File.WriteAllText(Path.Combine(repo.Ordner, "sql", "a.sql"), "SELECT 2;\n");
            var c2 = repo.Committe("c2", "Alex Beispiel", "2026-01-01T10:00:01", "");
            File.WriteAllText(Path.Combine(repo.Ordner, "sql", "a.sql"), "SELECT 3;\n"); // Arbeitsbaum, nicht committet
            return new RepoC(repo, c1, c2);
        }
        catch
        {
            repo.Dispose();
            throw;
        }
    }

    /// <summary>Die Blobs `f\xFF.sql` (rohes 0xFF) und `f\uFFFD.sql` (echtes Ersatzzeichen) — nur über python3 herstellbar.</summary>
    private static void LegeRohbyteNamen(string ordner)
    {
        var skript = $"import os\nopen(b'{ordner}/f\\xff.sql', 'wb').write(b'INHALT-RAW\\n')\nopen(b'{ordner}/f\\xef\\xbf\\xbd.sql', 'wb').write(b'INHALT-FFFD\\n')\n";
        using var python = System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("python3", ["-c", skript]) { WorkingDirectory = ordner });
        python?.WaitForExit();
    }

    private static void LegUnixAusfuehrbar(string pfad)
    {
        if (OperatingSystem.IsLinux() || OperatingSystem.IsMacOS())
        {
            var rechte = File.GetUnixFileMode(pfad);
            File.SetUnixFileMode(pfad, rechte | UnixFileMode.UserExecute | UnixFileMode.GroupExecute | UnixFileMode.OtherExecute);
        }
    }

    public void Dispose()
    {
        using (var python = System.Diagnostics.Process.Start("python3", ["-c", $"import os; os.unlink(b'{repo.Ordner}/f\\xff.sql')"]))
        {
            python?.WaitForExit();
        }
        repo.Dispose();
    }
}
