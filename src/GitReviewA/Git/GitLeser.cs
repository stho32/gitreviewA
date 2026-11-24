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
        var ausgabe = Ausfuehren(start, "git log");
        return GitLogAusgabe.Zerlegen(ausgabe);
    }

    /// <summary>Merge-Commits gegen den ersten Elternteil (Entscheidung des PO, gilt auch für den Diff einer Datei).</summary>
    public static Dateiaenderungen DateienLesen(string hash, string arbeitsordner)
    {
        var start = GitShowDateienStart(hash, arbeitsordner);
        var ausgabe = Ausfuehren(start, $"git show {hash}");
        return DateiaenderungenParser.Parse(ausgabe);
    }

    /// <summary>Pfade der Dateiliste sind wurzelrelativ; jeder weitere git-Aufruf läuft deshalb in der Wurzel des Arbeitsbaums.</summary>
    public static string WurzelLesen(string startordner)
    {
        var start = GitStart.Im(startordner);
        start.ArgumentList.Add("rev-parse");
        start.ArgumentList.Add("--show-toplevel");
        var ausgabe = Ausfuehren(start, "git rev-parse --show-toplevel");
        return ausgabe.TrimEnd('\n');
    }

    /// <summary>
    /// Ein Bereich ergibt dieselbe Liste wie <c>git rev-list</c>. Mehrere Bereiche ergeben die Vereinigung der einzelnen Bereiche,
    /// neuester zuerst: bei git selbst würde der Anfang eines Bereichs auch die anderen Bereiche beschneiden.
    /// Je Bereich wird höchstens ein Commit mehr als die Grenze gelesen, damit eine zu große Auswahl erkennbar ist.
    /// </summary>
    public static Commitzeilen LeseBereiche(Bereiche bereiche, string arbeitsordner)
    {
        var istEinBereich = bereiche.Anzahl == 1;
        if (istEinBereich)
        {
            return LeseBereich(bereiche[0], arbeitsordner);
        }
        var vereinigteHashes = VereinigeBereiche(bereiche, arbeitsordner);
        return LeseNeuesteZuerst(vereinigteHashes, arbeitsordner);
    }

    private static Commitzeilen LeseBereich(string bereich, string arbeitsordner)
    {
        var start = GitLogBereichStart(bereich, arbeitsordner);
        var ausgabe = Ausfuehren(start, $"git log {bereich}");
        return GitLogAusgabe.Zerlegen(ausgabe);
    }

    private static CommitHashes VereinigeBereiche(Bereiche bereiche, string arbeitsordner)
    {
        var vereinigt = new List<string>();
        var bekannt = new HashSet<string>(StringComparer.Ordinal);
        foreach (var bereich in bereiche)
        {
            foreach (var zeile in LeseBereich(bereich, arbeitsordner))
            {
                var istNeu = bekannt.Add(zeile.Hash);
                if (istNeu)
                {
                    vereinigt.Add(zeile.Hash);
                }
            }
        }
        return new CommitHashes(vereinigt.Take(Auswahlgrenze.Hoechstzahl + 1));
    }

    private static Commitzeilen LeseNeuesteZuerst(CommitHashes hashes, string arbeitsordner)
    {
        var start = GitLogMitFormat(arbeitsordner);
        start.ArgumentList.Add("--no-walk=sorted");
        start.ArgumentList.Add("--end-of-options");
        foreach (var hash in hashes)
        {
            start.ArgumentList.Add(hash);
        }
        var ausgabe = Ausfuehren(start, "git log");
        return GitLogAusgabe.Zerlegen(ausgabe);
    }

    private static ProcessStartInfo GitLogStart(CommitHashes hashes, string arbeitsordner)
    {
        var start = GitLogMitFormat(arbeitsordner);
        start.ArgumentList.Add("--no-walk=unsorted");
        start.ArgumentList.Add("--end-of-options");
        foreach (var hash in hashes)
        {
            start.ArgumentList.Add(hash);
        }
        return start;
    }

    private static ProcessStartInfo GitLogBereichStart(string bereich, string arbeitsordner)
    {
        var start = GitLogMitFormat(arbeitsordner);
        start.ArgumentList.Add($"--max-count={Auswahlgrenze.Hoechstzahl + 1}");
        start.ArgumentList.Add("--end-of-options");
        start.ArgumentList.Add(bereich);
        start.ArgumentList.Add("--");
        return start;
    }

    private static ProcessStartInfo GitLogMitFormat(string arbeitsordner)
    {
        var start = GitStart.Im(arbeitsordner);
        start.ArgumentList.Add("log");
        start.ArgumentList.Add("--no-color");
        start.ArgumentList.Add("--encoding=UTF-8");
        start.ArgumentList.Add("-z");
        start.ArgumentList.Add("--format=%H%x1f%an%x1f%aI%x1f%s%x1f%b");
        return start;
    }

    private static ProcessStartInfo GitShowDateienStart(string hash, string arbeitsordner)
    {
        var start = GitStart.Im(arbeitsordner);
        start.ArgumentList.Add("show");
        start.ArgumentList.Add("--format=");
        start.ArgumentList.Add("--no-color");
        start.ArgumentList.Add("--no-ext-diff");
        start.ArgumentList.Add("--no-textconv");
        start.ArgumentList.Add("--ignore-submodules=none");
        start.ArgumentList.Add("-m");
        start.ArgumentList.Add("--first-parent");
        start.ArgumentList.Add("-M");
        start.ArgumentList.Add("--raw");
        start.ArgumentList.Add("--numstat");
        start.ArgumentList.Add("--no-abbrev");
        start.ArgumentList.Add("-z");
        start.ArgumentList.Add("--end-of-options");
        start.ArgumentList.Add(hash);
        return start;
    }

    private static string Ausfuehren(ProcessStartInfo start, string aufruf)
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
            throw new GitFehler($"{aufruf} endete mit {prozess.ExitCode}: {fehler.ToString().Trim()}");
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
