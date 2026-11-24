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

    public Aenderantwort Aendere(int nummer, string text)
    {
        return treiber.Aendere(nummer, text);
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