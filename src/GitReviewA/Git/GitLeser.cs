using System.ComponentModel;
using System.Diagnostics;
using System.Text;
using GitReviewA.Aufruf;

namespace GitReviewA.Git;

internal static class GitLeser
{
    private const int MergeBaseOhneGemeinsamenVorfahren = 1;

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
    /// Pfade gehen wörtlich an git (kein Pathspec-Muster); bei einer Umbenennung beide Pfade, sonst zeigt git die Datei als neu.
    /// Kontext, Leerzeilen und Farben setzt der Aufruf selbst — die Konfiguration des fremden Repos verschiebt sonst die Zeilennummern.
    /// </summary>
    public static string DiffLesen(string hash, Dateiaenderung datei, string arbeitsordner)
    {
        var start = GitShowDiffStart(hash, datei, arbeitsordner);
        return Ausfuehren(start, $"git show {hash} -- {datei.Pfad}");
    }

    /// <summary>
    /// Ein Bereich ergibt dieselbe Liste wie <c>git rev-list</c>. Mehrere Bereiche ergeben die Vereinigung der einzelnen Bereiche,
    /// neuester zuerst und Kind vor Eltern wie <c>git rev-list --date-order</c>: bei git selbst würde der Anfang eines Bereichs
    /// auch die anderen Bereiche beschneiden. Die Reihenfolge hängt nur an der Vereinigung, nicht an der Reihenfolge der Bereiche,
    /// auch bei gleichen Commit-Zeiten. Je Bereich wird höchstens ein Commit mehr als die Grenze gelesen, damit eine zu große Auswahl erkennbar ist.
    /// </summary>
    public static Commitzeilen LeseBereiche(Bereiche bereiche, string arbeitsordner)
    {
        var istEinBereich = bereiche.Anzahl == 1;
        if (istEinBereich)
        {
            return LeseBereich(bereiche[0], arbeitsordner);
        }
        var vereinigteHashes = VereinigeBereiche(bereiche, arbeitsordner);
        var gemeinsameVorfahren = LeseGemeinsameVorfahrenDerAnfaenge(bereiche, arbeitsordner);
        return LeseNeuesteZuerst(vereinigteHashes, gemeinsameVorfahren, arbeitsordner);
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

    /// <summary>
    /// Kein Commit der Vereinigung ist Vorfahr eines gemeinsamen Vorfahren aller Anfänge — dort darf der Verlauf enden,
    /// damit <c>--date-order</c> nicht die ganze Geschichte durchläuft. Ohne gemeinsamen Vorfahren bleibt die Liste leer.
    /// </summary>
    private static CommitHashes LeseGemeinsameVorfahrenDerAnfaenge(Bereiche bereiche, string arbeitsordner)
    {
        var start = GitStart.Im(arbeitsordner);
        start.ArgumentList.Add("merge-base");
        start.ArgumentList.Add("--octopus");
        start.ArgumentList.Add("--all");
        start.ArgumentList.Add("--end-of-options");
        foreach (var bereich in bereiche)
        {
            start.ArgumentList.Add(AnfangDes(bereich));
        }
        var lauf = WarteAufEnde(Starte(start));
        var keinGemeinsamerVorfahr = lauf.ExitCode == MergeBaseOhneGemeinsamenVorfahren && lauf.Ausgabe.Length == 0;
        if (keinGemeinsamerVorfahr)
        {
            return new CommitHashes([]);
        }
        PruefeErfolg(lauf, "git merge-base");
        return new CommitHashes(lauf.Ausgabe.Split('\n', StringSplitOptions.RemoveEmptyEntries));
    }

    private static string AnfangDes(string bereich)
    {
        var anfang = bereich[..bereich.IndexOf(Bereichspruefer.Bereichstrenner, StringComparison.Ordinal)];
        var anfangFehlt = anfang.Length == 0;
        if (anfangFehlt)
        {
            return "HEAD";
        }
        return anfang;
    }

    private static Commitzeilen LeseNeuesteZuerst(CommitHashes hashes, CommitHashes gemeinsameVorfahren, string arbeitsordner)
    {
        var start = GitLogMitFormat(arbeitsordner);
        start.ArgumentList.Add("--date-order");
        start.ArgumentList.Add("--end-of-options");
        var hashesUnabhaengigVonDerBereichsreihenfolge = new SortedSet<string>(StringComparer.Ordinal);
        foreach (var hash in hashes)
        {
            hashesUnabhaengigVonDerBereichsreihenfolge.Add(hash);
        }
        foreach (var hash in hashesUnabhaengigVonDerBereichsreihenfolge)
        {
            start.ArgumentList.Add(hash);
        }
        foreach (var vorfahr in gemeinsameVorfahren)
        {
            start.ArgumentList.Add($"^{vorfahr}");
        }
        start.ArgumentList.Add("--");
        var verlauf = GitLogAusgabe.Zerlegen(Ausfuehren(start, "git log"));
        return NurDieAusDerVereinigung(verlauf, hashesUnabhaengigVonDerBereichsreihenfolge);
    }

    private static Commitzeilen NurDieAusDerVereinigung(Commitzeilen verlauf, SortedSet<string> vereinigung)
    {
        var auswahl = new List<Commitzeile>();
        foreach (var zeile in verlauf)
        {
            var gehoertZurVereinigung = vereinigung.Contains(zeile.Hash);
            if (gehoertZurVereinigung)
            {
                auswahl.Add(zeile);
            }
        }
        return new Commitzeilen(auswahl);
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

    private static ProcessStartInfo GitShowDiffStart(string hash, Dateiaenderung datei, string arbeitsordner)
    {
        var start = GitStart.Im(arbeitsordner);
        start.ArgumentList.Add("--literal-pathspecs");
        start.ArgumentList.Add("-c");
        start.ArgumentList.Add("diff.suppressBlankEmpty=false");
        start.ArgumentList.Add("show");
        start.ArgumentList.Add("--format=");
        start.ArgumentList.Add("--no-color");
        start.ArgumentList.Add("--no-ext-diff");
        start.ArgumentList.Add("--no-textconv");
        start.ArgumentList.Add("--ignore-submodules=none");
        start.ArgumentList.Add("-m");
        start.ArgumentList.Add("--first-parent");
        start.ArgumentList.Add("-M");
        start.ArgumentList.Add("-U3");
        start.ArgumentList.Add("--inter-hunk-context=0");
        start.ArgumentList.Add("--end-of-options");
        start.ArgumentList.Add(hash);
        start.ArgumentList.Add("--");
        start.ArgumentList.Add(datei.Pfad);
        var alterPfad = datei.AlterPfad;
        if (alterPfad is not null)
        {
            start.ArgumentList.Add(alterPfad);
        }
        return start;
    }

    private static string Ausfuehren(ProcessStartInfo start, string aufruf)
    {
        var lauf = WarteAufEnde(Starte(start));
        PruefeErfolg(lauf, aufruf);
        return lauf.Ausgabe;
    }

    private static void PruefeErfolg(GitLauf lauf, string befehl)
    {
        var gitIstGescheitert = lauf.ExitCode != 0;
        if (gitIstGescheitert)
        {
            throw new GitFehler($"{befehl} endete mit {lauf.ExitCode}: {lauf.Fehlertext}");
        }
    }

    private static GitLauf WarteAufEnde(Process gestartet)
    {
        using var prozess = gestartet;
        var fehler = new StringBuilder();
        prozess.ErrorDataReceived += (_, zeile) => fehler.AppendLine(zeile.Data);
        prozess.BeginErrorReadLine();
        var ausgabe = prozess.StandardOutput.ReadToEnd();
        prozess.WaitForExit();
        return new GitLauf(prozess.ExitCode, ausgabe, fehler.ToString().Trim());
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

    private sealed record GitLauf(int ExitCode, string Ausgabe, string Fehlertext);
}
