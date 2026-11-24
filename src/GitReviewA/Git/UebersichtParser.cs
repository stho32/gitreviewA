using GitReviewA.Aufruf;
using GitReviewA.Diff;
using GitReviewA.Haken;

namespace GitReviewA.Git;

/// <summary>
/// Zerlegt die Ausgabe von <c>git log --format=%x1e%H --raw --numstat -z</c> für mehrere Commits: je Commit ein Kopf aus Satztrenner und
/// vollem Hash, danach (mit einem Zeilenumbruch davor) seine Datensätze wie bei <c>git show</c>; ein leerer Commit hat nur den Kopf.
/// Pfade werden nach ihrer Position gelesen, ein Pfad, der wie ein Kopf aussieht, bleibt Pfad. Den Sperrgrund je Stelle entscheidet
/// dieselbe <see cref="Namenspruefung"/> wie den Diff-Ausgang — Diff und Haken laufen nie auseinander.
/// </summary>
internal static class UebersichtParser
{
    private const string Satztrenner = "\u001e";
    private const string ZeilenumbruchVorDenDateien = "\n";
    private const int KurzHashLaenge = 7;

    public static Dateiuebersicht Parse(byte[] ausgabe, CommitHashes auswahl)
    {
        var teile = DateiaenderungenParser.TeileInBytezeichen(ausgabe);
        var position = 0;
        var commits = new List<Commitdateien>();
        var stellen = new List<Uebersichtsstelle>();
        foreach (var hash in auswahl)
        {
            PruefeKopf(teile, position, hash);
            position++;
            EntferneZeilenumbruchVorDenDateien(teile, position);
            var dateienDesCommits = DateiaenderungenParser.LiesDateienEinesCommits(teile, ref position);
            commits.Add(new Commitdateien(hash, dateienDesCommits));
            stellen.AddRange(StellenDesCommits(hash, dateienDesCommits));
        }
        DateiaenderungenParser.PruefeVollstaendigGelesen(teile, position);
        return new Dateiuebersicht(commits, stellen);
    }

    private static List<Uebersichtsstelle> StellenDesCommits(string hash, Dateiaenderungen dateienDesCommits)
    {
        var stellen = new List<Uebersichtsstelle>(dateienDesCommits.Anzahl);
        foreach (var datei in dateienDesCommits)
        {
            var fall = Namenspruefung.Pruefe(dateienDesCommits, datei.Pfad).Fall;
            stellen.Add(new Uebersichtsstelle(new Stelle(hash, datei.Pfad), Sperrgruende.Aus(fall)));
        }
        return stellen;
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
