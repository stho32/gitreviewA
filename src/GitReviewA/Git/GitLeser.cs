using System.ComponentModel;
using System.Diagnostics;
using System.Text;
using GitReviewA.Aufruf;

namespace GitReviewA.Git;

internal static class GitLeser
{
    public static Commitzeilen Lesen(CommitHashes hashes, string arbeitsordner)
    {
        var start = GitLogStart(hashes, arbeitsordner);
        var ausgabe = Ausfuehren(start);
        return GitLogAusgabe.Zerlegen(ausgabe);
    }

    private static ProcessStartInfo GitLogStart(CommitHashes hashes, string arbeitsordner)
    {
        var start = GitStart.Im(arbeitsordner);
        start.ArgumentList.Add("log");
        start.ArgumentList.Add("--no-walk=unsorted");
        start.ArgumentList.Add("--no-color");
        start.ArgumentList.Add("--encoding=UTF-8");
        start.ArgumentList.Add("--format=%H%x1f%s");
        start.ArgumentList.Add("--end-of-options");
        foreach (var hash in hashes)
        {
            start.ArgumentList.Add(hash);
        }
        return start;
    }

    private static string Ausfuehren(ProcessStartInfo start)
    {
        using var prozess = Starte(start);
        var fehler = new StringBuilder();
        prozess.ErrorDataReceived += (_, zeile) => fehler.AppendLine(zeile.Data);
        prozess.BeginErrorReadLine();
        var ausgabe = prozess.StandardOutput.ReadToEnd();
        prozess.WaitForExit();
        var gitIstGescheitert = prozess.ExitCode != 0;
        if (gitIstGescheitert)
        {
            throw new GitFehler($"git log endete mit {prozess.ExitCode}: {fehler.ToString().Trim()}");
        }
        return ausgabe;
    }

    private static Process Starte(ProcessStartInfo start)
    {
        Process? prozess;
        try
        {
            prozess = Process.Start(start);
        }
        catch (Win32Exception fehler)
        {
            throw new GitFehler($"git ließ sich nicht starten — ist git installiert und im PATH? ({fehler.Message})");
        }
        if (prozess is null)
        {
            throw new GitFehler("git ließ sich nicht starten");
        }
        return prozess;
    }
}
