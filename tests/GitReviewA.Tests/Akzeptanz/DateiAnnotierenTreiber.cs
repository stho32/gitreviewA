using GitReviewA.Anmerkungen;
using GitReviewA.Aufruf;
using GitReviewA.Beenden;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Protokoll;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Treiber in-process für R00022 „Datei annotieren“: verdrahtet den Interactor wie der Webserver (Auswahl aus echtem git, Speicher,
/// Protokoll auf Stufe Debug) und kennt als einziger seine Typen. Die Stelleprüfung lässt sich durch eine feste Übersicht ersetzen —
/// in der Anwendung ist die gesperrte Stelle nicht erreichbar (R00022 Kriterium 6). Je Aufruf ein frischer Interactor wie eine Anfrage.
/// </summary>
internal sealed class DateiAnnotierenTreiber
{
    private readonly CommitAuswahl auswahl;
    private readonly Anmerkungsspeicher speicher;
    private readonly StderrProtokoll protokoll;
    private readonly StringWriter protokollziel;
    private Stellensperre sperre;

    private DateiAnnotierenTreiber(CommitAuswahl auswahl, Anmerkungsspeicher speicher, Stellensperre sperre, StderrProtokoll protokoll, StringWriter protokollziel)
    {
        this.auswahl = auswahl;
        this.speicher = speicher;
        this.sperre = sperre;
        this.protokoll = protokoll;
        this.protokollziel = protokollziel;
    }

    public static DateiAnnotierenTreiber Starten(string startordner, IEnumerable<string> hashes)
    {
        var commits = GitLeser.Lesen(new CommitHashes(hashes), startordner);
        var arbeitsordner = GitLeser.WurzelLesen(startordner);
        var protokollziel = new StringWriter();
        var protokoll = new StderrProtokoll(protokollziel, TimeProvider.System, Protokollstufe.Debug);
        var speicher = new Anmerkungsspeicher();
        var sperre = new Stellensperre(new GemerkteUebersicht(new GitUebersichtsquelle(commits, arbeitsordner)), protokoll);
        return new DateiAnnotierenTreiber(new CommitAuswahl(commits), speicher, sperre, protokoll, protokollziel);
    }

    /// <summary>Ab jetzt meldet die Übersicht diese feste Stelle als gesperrt (Kriterium 6).</summary>
    public void SperreDurchFesteUebersicht(IUebersichtsquelle quelle)
    {
        sperre = new Stellensperre(new GemerkteUebersicht(quelle), protokoll);
    }

    public Anlegeantwort LegeAn(string commit, string datei, int? zeile, string text)
    {
        var ergebnis = new ZeileAnnotierenInteractor(speicher, auswahl, sperre, protokoll).LegeAn(new NeueAnmerkung(commit, datei, zeile, text));
        return ergebnis.Ausgang switch
        {
            Annotierenausgang.Angelegt => new Anlegeantwort("angelegt", ergebnis.Angelegt!.Nummer, ""),
            Annotierenausgang.Ungueltig => new Anlegeantwort("ungültig", null, ergebnis.Grund),
            Annotierenausgang.Beendet => new Anlegeantwort("beendet", null, ergebnis.Grund),
            _ => throw new InvalidOperationException($"Unbekannter Ausgang {ergebnis.Ausgang}"),
        };
    }

    public Listeneintrag[] Liste()
    {
        var eintraege = new List<Listeneintrag>();
        foreach (var anmerkung in speicher.Schnappschuss())
        {
            eintraege.Add(new Listeneintrag(anmerkung.Nummer, anmerkung.Commit, anmerkung.Datei, anmerkung.Zeile, anmerkung.Text));
        }
        return eintraege.ToArray();
    }

    /// <summary>Wie „Beenden“: schließt den Speicher ab und liefert das Ergebnis, das auf stdout ginge.</summary>
    public string Beenden()
    {
        speicher.VersucheAbzuschliessen();
        return ErgebnisFormatierer.Formatiere(speicher.Schnappschuss(), new Dateienstand([]));
    }

    public string Protokoll()
    {
        return protokollziel.ToString();
    }
}
