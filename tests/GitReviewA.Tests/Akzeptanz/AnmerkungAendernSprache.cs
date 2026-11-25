using System.Runtime.Versioning;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Testsprache „Anmerkung ändern“ (R00018): Commits heißen wie in der User Story, geändert wird über die stabile Nummer.
/// Darunter der Treiber, der Anlegen und Ändern in-process ruft.
/// </summary>
[UnsupportedOSPlatform("windows")]
internal sealed class AnmerkungAendernSprache
{
    private readonly DiffRepo repo;
    private readonly AnmerkungAendernTreiber treiber;

    private AnmerkungAendernSprache(DiffRepo repo, AnmerkungAendernTreiber treiber)
    {
        this.repo = repo;
        this.treiber = treiber;
    }

    /// <summary>`gitreviewA <commits…>` im Repo.</summary>
    public static AnmerkungAendernSprache Aufruf(DiffRepo repo, string[] commits)
    {
        var treiber = AnmerkungAendernTreiber.Starten(repo.Ordner, commits.Select(repo.Hash));
        return new AnmerkungAendernSprache(repo, treiber);
    }

    /// <summary>Ab jetzt meldet die Übersicht die Stelle als gesperrt — eine feste Übersicht statt git (Kriterium 8).</summary>
    public void SperreAbJetzt(string commit, string gesperrterPfad, string sperrgrund, string lesbarerPfad)
    {
        treiber.SperreDurchFesteUebersicht(TestUebersichtsquelle.MitSperre(repo.Hash(commit), gesperrterPfad, sperrgrund, lesbarerPfad));
    }

    public Anlegeantwort LegeAn(string commit, string datei, int? nummerNeu, string text)
    {
        return treiber.LegeAn(repo.Hash(commit), datei, nummerNeu, text);
    }

    /// <summary>Eine Anmerkung mit Art anlegen (R00036): `art` ist `muss`, `frage` oder `idee`.</summary>
    public Anlegeantwort LegeAnMitArt(string commit, string datei, int? nummerNeu, string text, string art)
    {
        return treiber.LegeAn(repo.Hash(commit), datei, nummerNeu, text, System.Text.Json.JsonSerializer.SerializeToElement(art));
    }

    /// <summary>Ändert den Text; ohne Art im Körper bleibt die gespeicherte Art (R00036).</summary>
    public Aenderantwort Aendere(int nummer, string text)
    {
        return treiber.Aendere(nummer, text);
    }

    /// <summary>Setzt oder wechselt die Art (R00036).</summary>
    public Aenderantwort AendereMitArt(int nummer, string text, string art)
    {
        return treiber.AendereMitArt(nummer, text, art);
    }

    /// <summary>Entfernt die Art (ausdrückliches `null` im Körper, R00036).</summary>
    public Aenderantwort AendereOhneArt(int nummer, string text)
    {
        return treiber.AendereOhneArt(nummer, text);
    }

    /// <summary>Eine rohe Art im Körper — etwa `"MUSS"`, `7` oder `""` (R00036 Kriterium 4).</summary>
    public Aenderantwort AendereMitRohart(int nummer, string text, string roh)
    {
        return treiber.AendereMitRohart(nummer, text, roh);
    }

    /// <summary>Das Ergebnis, ohne den Lauf zu beenden (wie „Ergebnis kopieren“).</summary>
    public string Ergebnis()
    {
        return treiber.Ergebnis();
    }

    public Aenderantwort AendereOhneWunsch()
    {
        return treiber.AendereOhneWunsch();
    }

    /// <summary>Der Zwischenzustand „Anmerkung zwischen Finden und Ersetzen weggefallen“ (Löschen, I0024) — ohne Wettlauf.</summary>
    public Aenderantwort AendereMitVerschwundenerAnmerkung(int nummer, string text)
    {
        return treiber.AendereMitVerschwundenerAnmerkung(nummer, text);
    }

    public Listeneintrag[] Anmerkungen()
    {
        return treiber.Liste();
    }

    public Listeneintrag Anmerkung(int nummer, string commit, string datei, int? nummerNeu, string text)
    {
        return new Listeneintrag(nummer, repo.Hash(commit), datei, nummerNeu, text);
    }

    /// <summary>Ein Listeneintrag mit Art (R00036): `art` ist `muss`, `frage`, `idee` oder `null`.</summary>
    public Listeneintrag AnmerkungMitArt(int nummer, string commit, string datei, int? nummerNeu, string text, string art)
    {
        return new Listeneintrag(nummer, repo.Hash(commit), datei, nummerNeu, text, Art: GitReviewA.Anmerkungen.Anmerkungsart.Pruefe(art).Angabe.Wert);
    }

    public string Beenden()
    {
        return treiber.Beenden();
    }

    /// <summary>Der Abschnitt einer Anmerkung im Ergebnis, Format R00002.</summary>
    public string Ergebnisabschnitt(int position, string stelle, string commit, string zitat)
    {
        return $"## {position}. {stelle}\n\nCommit: {repo.Hash(commit)}\n\n{zitat}\n";
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