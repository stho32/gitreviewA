using System.Diagnostics;
using System.Runtime.Versioning;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Repo V der User Story R00024 (R00024 AK Vorbereitung, Commits `p` und `q`): Bilder je Typ, ein `.svg`, eine Textdatei mit
/// `.png`-Endung, eine Umbenennung und ein Name mit ungültigem Byte. Angelegt mit einem bash-Skript, weil .NET nur Namen in
/// gültigem UTF-8 anlegt und die Bildbytes eingebettete base64-Zeichenketten sind. Gleicher Inhalt wie <c>e2e/treiber/bild-repo.js</c>.
/// </summary>
[UnsupportedOSPlatform("windows")]
internal sealed class BildRepo : IDisposable
{
    /// <summary>Ein gültiges 1×1-PNG (RGBA).</summary>
    public const string Png1 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

    /// <summary>Ein gültiges 1×1-PNG mit anderen Bytes (gleicher Typ).</summary>
    public const string Png2 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

    /// <summary>Ein gültiges 1×1-JPEG.</summary>
    public const string Jpg = "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";

    /// <summary>Ein gültiges 1×1-GIF.</summary>
    public const string Gif = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

    /// <summary>Ein gültiges 1×1-WebP (RIFF-Container).</summary>
    public const string Webp = "UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=";

    /// <summary>Ein gültiges 1×1-PNG für die gelöschte Datei (eigene Bytes, damit git die Umbenennung eindeutig erkennt).</summary>
    public const string PngWeg = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP4z8DwHwAFAAH/VscvDQAAAABJRU5ErkJggg==";

    /// <summary>Ein gültiges 1×1-PNG für die unverändert umbenannte Datei.</summary>
    public const string PngAlt = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNg+M/wHwAEAQH/rrVV9QAAAABJRU5ErkJggg==";

    /// <summary>Ein gültiges 1×1-PNG für die neue Datei.</summary>
    public const string PngNeu = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNgYPj/HwADAgH/OSkZvgAAAABJRU5ErkJggg==";

    /// <summary>Ein gültiges 24×24-PNG über der klein gesetzten Bildgrenze (Grenzprobe).</summary>
    public const string PngGross = "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";

    private const string Skript = """
        set -e
        mkdir -p bilder
        bild() { printf '%s' "$2" | base64 -d > "$1"; }
        bild bilder/logo.png __PNG1__
        bild bilder/weg.png __PNGWEG__
        bild bilder/alt.png __PNGALT__
        bild bilder/foto.jpg __JPG__
        bild bilder/bunt.gif __GIF__
        bild bilder/klein.webp __WEBP__
        printf '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>\n' > bilder/karte.svg
        printf 'nur Text\n' > bilder/keinbild.png
        printf 'eins\nzwei\ndrei\nvier\nfuenf\nsechs\n' > notizen.txt
        git add -A && git commit -q -m "Start"
        bild bilder/logo.png __PNG2__
        bild bilder/neu.png __PNGNEU__
        git rm -q bilder/weg.png
        git mv bilder/alt.png bilder/umbenannt.png
        git mv notizen.txt notizen2.txt && printf 'eins\nZWEI\ndrei\nvier\nfuenf\nsechs\n' > notizen2.txt
        bild bilder/gross.png __PNGGROSS__
        bild $'bilder/b\xff.png' __PNG1__
        git add -A && git commit -q -m "Bilder ändern"
        rm -f -- $'bilder/b\xff.png'
        """;

    private readonly Dictionary<string, string> hashNachName = new(StringComparer.Ordinal);

    private BildRepo(string ordner)
    {
        Ordner = ordner;
    }

    public string Ordner { get; }

    public string Hash(string commit)
    {
        return hashNachName[commit];
    }

    public static BildRepo V()
    {
        return AusSkript(SkriptErsetzt(), "p", "q");
    }

    /// <summary>Repo V mit drei Diff-Programmen (Markerdateien), die die fremde Konfiguration starten ließe, und `*.png diff=marker`.</summary>
    public static BildRepo VMitFremderDiffKonfiguration()
    {
        var repo = V();
        try
        {
            repo.Git("config", "diff.external", repo.MarkerSkript("marker-extern"));
            repo.Git("config", "diff.marker.textconv", repo.MarkerSkript("marker-textconv"));
            repo.Git("config", "diff.marker.command", repo.MarkerSkript("marker-command"));
            repo.Schreibe(".gitattributes", "*.png diff=marker\n");
            return repo;
        }
        catch
        {
            repo.Dispose();
            throw;
        }
    }

    /// <summary>Die Bytes einer eingebetteten base64-Zeichenkette.</summary>
    public static byte[] Bytes(string base64)
    {
        return Convert.FromBase64String(base64);
    }

    public static readonly string[] Markerdateien = ["marker-extern", "marker-textconv", "marker-command"];

    public string[] VorhandeneMarker()
    {
        return Markerdateien.Where(marker => File.Exists(Path.Combine(Ordner, marker))).ToArray();
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

    private static string SkriptErsetzt()
    {
        return Skript
            .Replace("__PNGGROSS__", PngGross, StringComparison.Ordinal)
            .Replace("__PNGWEG__", PngWeg, StringComparison.Ordinal)
            .Replace("__PNGALT__", PngAlt, StringComparison.Ordinal)
            .Replace("__PNGNEU__", PngNeu, StringComparison.Ordinal)
            .Replace("__PNG1__", Png1, StringComparison.Ordinal)
            .Replace("__PNG2__", Png2, StringComparison.Ordinal)
            .Replace("__JPG__", Jpg, StringComparison.Ordinal)
            .Replace("__GIF__", Gif, StringComparison.Ordinal)
            .Replace("__WEBP__", Webp, StringComparison.Ordinal);
    }

    private static BildRepo AusSkript(string skript, params string[] commitsAeltesterZuerst)
    {
        var ordner = Directory.CreateTempSubdirectory("gitreviewa-test-").FullName;
        var repo = new BildRepo(ordner);
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

    private void Schreibe(string pfad, string inhalt)
    {
        var ziel = new FileInfo(Path.Combine(Ordner, pfad));
        ziel.Directory?.Create();
        File.WriteAllText(ziel.FullName, inhalt);
    }

    private string MarkerSkript(string marker)
    {
        var skript = Path.Combine(Ordner, ".git", $"{marker}.sh");
        var datei = new FileInfo(skript);
        datei.Directory?.Create();
        File.WriteAllText(skript, $"#!/bin/sh\ntouch '{Path.Combine(Ordner, marker)}'\ncat \"$1\" 2>/dev/null\n");
        File.SetUnixFileMode(skript, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        return skript;
    }
}
