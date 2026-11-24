using GitReviewA.Aufruf;
using GitReviewA.Haken;

namespace GitReviewA.Git;

/// <summary>
/// Zerlegt die Ausgabe von <c>git log --format=%x1e%H --raw --numstat -z</c> für mehrere Commits: je Commit ein Kopf aus Satztrenner und
/// vollem Hash, danach (mit einem Zeilenumbruch davor) seine Datensätze wie bei <c>git show</c>; ein leerer Commit hat nur den Kopf.
/// Pfade werden nach ihrer Position gelesen, ein Pfad, der wie ein Kopf aussieht, bleibt Pfad.
/// </summary>
internal static class UebersichtParser
{
    private const char Nul = '\0';
    private const string Satztrenner = "\u001e";
    private const string ZeilenumbruchVorDenDateien = "\n";
    private const int KurzHashLaenge = 7;

    public static Dateiuebersicht Parse(string ausgabe, CommitHashes auswahl)
    {
        var teile = ausgabe.Split(Nul);
        var position = 0;
        var commits = new List<string>();
        var stellen = new List<Stelle>();
        foreach (var hash in auswahl)
        {
            commits.Add(hash);
            PruefeKopf(teile, position, hash);
            position++;
            EntferneZeilenumbruchVorDenDateien(teile, position);
            foreach (var datei in DateiaenderungenParser.LiesDateienEinesCommits(teile, ref position))
            {
                stellen.Add(new Stelle(hash, datei.Pfad));
            }
        }
        DateiaenderungenParser.PruefeVollstaendigGelesen(teile, position);
        return new Dateiuebersicht(commits, stellen);
    }

    private static void PruefeKopf(string[] teile, int position, string hash)
    {
        var istKopfDesErwartetenCommits = position < teile.Length && teile[position] == Satztrenner + hash;
        if (!istKopfDesErwartetenCommits)
        {
            throw new GitFehler($"unerwartete Ausgabe von git log (Übersicht: Commit {hash[..KurzHashLaenge]} fehlt an seiner Stelle)");
        }
    }

    private static void EntferneZeilenumbruchVorDenDateien(string[] teile, int position)
    {
        var folgenDateien = position < teile.Length && teile[position].StartsWith(ZeilenumbruchVorDenDateien, StringComparison.Ordinal);
        if (folgenDateien)
        {
            teile[position] = teile[position][ZeilenumbruchVorDenDateien.Length..];
        }
    }
}
