using System.Runtime.Versioning;
using System.Text.Json;
using GitReviewA.Anmerkungen;
using GitReviewA.Git;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Testsprache „Zeile annotieren“ (R00010): Commits heißen wie in der User Story, Zeilen tragen ihre Nummer neu (Stand nach dem Commit).
/// Darunter der Treiber, der den Interactor in-process ruft.
/// </summary>
[UnsupportedOSPlatform("windows")]
internal sealed class ZeileAnnotierenSprache
{
    private readonly DiffRepo repo;
    private readonly ZeileAnnotierenTreiber treiber;

    private ZeileAnnotierenSprache(DiffRepo repo, ZeileAnnotierenTreiber treiber)
    {
        this.repo = repo;
        this.treiber = treiber;
    }

    /// <summary>`gitreviewA <commits…>` im Repo.</summary>
    public static ZeileAnnotierenSprache Aufruf(DiffRepo repo, string[] commits)
    {
        return Aufruf(repo, commits, Ausgabegrenze.Standard);
    }

    /// <summary>Wie <see cref="Aufruf"/>, aber der Lesepfad der markierten Zeilen liest gegen eine kleine Ausgabegrenze (R00031).</summary>
    public static ZeileAnnotierenSprache AufrufMitKleinerAusgabegrenze(DiffRepo repo, string[] commits)
    {
        return Aufruf(repo, commits, new Ausgabegrenze(100));
    }

    private static ZeileAnnotierenSprache Aufruf(DiffRepo repo, string[] commits, Ausgabegrenze grenze)
    {
        var treiber = ZeileAnnotierenTreiber.Starten(repo.Ordner, commits.Select(repo.Hash), grenze);
        return new ZeileAnnotierenSprache(repo, treiber);
    }

    public Anlegeantwort Annotiere(string commit, string datei, int nummerNeu, string text)
    {
        return treiber.LegeAn(repo.Hash(commit), datei, nummerNeu, text);
    }

    /// <summary>Eine Anmerkung mit einer der drei Arten (R00036).</summary>
    public Anlegeantwort AnnotiereMitArt(string commit, string datei, int nummerNeu, string text, string art)
    {
        return treiber.LegeAn(repo.Hash(commit), datei, nummerNeu, text, JsonSerializer.SerializeToElement(art));
    }

    /// <summary>Eine rohe Art im Körper — etwa `"MUSS"`, `7` oder `""` (R00036 Kriterium 4).</summary>
    public Anlegeantwort AnnotiereMitRohart(string commit, string datei, int nummerNeu, string text, string roh)
    {
        using var dokument = JsonDocument.Parse(roh);
        return treiber.LegeAn(repo.Hash(commit), datei, nummerNeu, text, dokument.RootElement);
    }

    /// <summary>Ein Listeneintrag mit Art (R00036): `art` ist `muss`, `frage`, `idee` oder `null`.</summary>
    public Listeneintrag AnmerkungMitArt(int nummer, string commit, string datei, int? nummerNeu, string text, string? art)
    {
        return new Listeneintrag(nummer, repo.Hash(commit), datei, nummerNeu, text, Art: art is null ? null : Anmerkungsart.Pruefe(art).Angabe.Wert);
    }

    /// <summary>Eine Bereichsanmerkung (R00031): Anker und Ziel als Nummern neu.</summary>
    public Anlegeantwort AnnotiereBereich(string commit, string datei, int von, int bis, string text)
    {
        return treiber.LegeAnBereich(repo.Hash(commit), datei, von, bis, text);
    }

    /// <summary>Ein Request mit `zeile` und `von`/`bis` zusammen (R00031, Form).</summary>
    public Anlegeantwort AnnotiereMitBereichUndZeile(string commit, string datei, int nummerNeu, int von, int bis, string text)
    {
        return treiber.LegeAnMitZeileUndBereich(repo.Hash(commit), datei, nummerNeu, von, bis, text);
    }

    public Anlegeantwort AnnotiereMitGekuerztemHash(string commit, string datei, int nummerNeu, string text)
    {
        return treiber.LegeAn(repo.Hash(commit)[..7], datei, nummerNeu, text);
    }

    public Listeneintrag[] Anmerkungen()
    {
        return treiber.Liste();
    }

    public Listeneintrag Anmerkung(int nummer, string commit, string datei, int nummerNeu, string text)
    {
        return new Listeneintrag(nummer, repo.Hash(commit), datei, nummerNeu, text);
    }

    /// <summary>Ein Listeneintrag einer Bereichsanmerkung (R00031).</summary>
    public Listeneintrag Bereich(int nummer, string commit, string datei, int von, int bis, string text)
    {
        return new Listeneintrag(nummer, repo.Hash(commit), datei, null, text, von, bis);
    }

    public string Beenden()
    {
        return treiber.Beenden();
    }

    /// <summary>Den Text der Anmerkung mit dieser stabilen Nummer ändern (R00018/I0023).</summary>
    public Aenderantwort Aendere(int nummer, string text)
    {
        return treiber.Aendere(nummer, text);
    }

    /// <summary>Die Anmerkung mit dieser stabilen Nummer löschen (R00019/I0024).</summary>
    public Loeschantwort Loesche(int nummer)
    {
        return treiber.Loesche(nummer);
    }

    /// <summary>Der Abschnitt einer Anmerkung im Ergebnis, Format R00002.</summary>
    public string Ergebnisabschnitt(int position, string stelle, string commit, string zitat)
    {
        return $"## {position}. {stelle}\n\nCommit: {repo.Hash(commit)}\n\n{zitat}\n";
    }

    /// <summary>Der Abschnitt einer Bereichsanmerkung (R00031): Stelle `<Datei>:<von>-<bis>`, Zitat der Zeilen, Textzitat.</summary>
    public string Bereichsabschnitt(int position, string datei, int von, int bis, string commit, string[] zeilen, string text)
    {
        var zitat = string.Join("\n", zeilen.Select((zeile, stelle) => $"    {von + stelle}: {zeile}"));
        return $"## {position}. {datei}:{von}-{bis}\n\nCommit: {repo.Hash(commit)}\n\n{zitat}\n\n> {text}\n";
    }

    public string[] Protokollzeilen()
    {
        return treiber.Protokoll().Split('\n', StringSplitOptions.RemoveEmptyEntries);
    }

    public string Protokoll()
    {
        return treiber.Protokoll();
    }
}
