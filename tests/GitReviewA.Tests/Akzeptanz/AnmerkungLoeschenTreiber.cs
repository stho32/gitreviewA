using GitReviewA.Anmerkungen;
using GitReviewA.Aufruf;
using GitReviewA.Beenden;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Protokoll;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Treiber in-process für R00019: verdrahtet Anlegen und Löschen wie der Webserver auf einem Speicher und einer gemerkten Übersicht;
/// das Löschen bekommt je Aufruf einen frischen Interactor wie eine Anfrage. Das Löschen fasst die Übersicht nicht an — die Stelle darf
/// laut Übersicht gesperrt sein (Kriterium 7).
/// </summary>
internal sealed class AnmerkungLoeschenTreiber
{
    private readonly CommitAuswahl auswahl;
    private readonly Anmerkungsspeicher speicher;
    private readonly StderrProtokoll protokoll;
    private readonly StringWriter protokollziel;
    private Stellensperre sperre;

    private AnmerkungLoeschenTreiber(CommitAuswahl auswahl, Anmerkungsspeicher speicher, Stellensperre sperre, StderrProtokoll protokoll, StringWriter protokollziel)
    {
        this.auswahl = auswahl;
        this.speicher = speicher;
        this.sperre = sperre;
        this.protokoll = protokoll;
        this.protokollziel = protokollziel;
    }

    public static AnmerkungLoeschenTreiber Starten(string startordner, IEnumerable<string> hashes)
    {
        var commits = GitLeser.Lesen(new CommitHashes(hashes), startordner);
        var arbeitsordner = GitLeser.WurzelLesen(startordner);
        var protokollziel = new StringWriter();
        var protokoll = new StderrProtokoll(protokollziel, TimeProvider.System, Protokollstufe.Debug);
        var speicher = new Anmerkungsspeicher();
        var uebersicht = new GemerkteUebersicht(new GitUebersichtsquelle(commits, arbeitsordner));
        var sperre = new Stellensperre(uebersicht, protokoll);
        return new AnmerkungLoeschenTreiber(new CommitAuswahl(commits), speicher, sperre, protokoll, protokollziel);
    }

    public void SperreDurchFesteUebersicht(IUebersichtsquelle quelle)
    {
        sperre = new Stellensperre(new GemerkteUebersicht(quelle), protokoll);
    }

    public Anlegeantwort LegeAn(string commit, string datei, int? zeile, string text)
    {
        var ergebnis = new ZeileAnnotierenInteractor(speicher, auswahl, sperre, protokoll).LegeAn(new NeueAnmerkung(commit, datei, zeile, text));
        switch (ergebnis.Ausgang)
        {
            case Annotierenausgang.Angelegt:
                return new Anlegeantwort("angelegt", ergebnis.Angelegt!.Nummer, string.Empty);
            case Annotierenausgang.Ungueltig:
                return new Anlegeantwort("ungültig", null, ergebnis.Grund);
            case Annotierenausgang.Beendet:
                return new Anlegeantwort("beendet", null, ergebnis.Grund);
            default:
                throw new InvalidOperationException($"Unbekannter Ausgang {ergebnis.Ausgang}");
        }
    }

    public Loeschantwort Loesche(int nummer)
    {
        var ergebnis = new AnmerkungLoeschenInteractor(speicher, protokoll).Loesche(new Loeschungswunsch(nummer));
        switch (ergebnis.Ausgang)
        {
            case Loeschungsausgang.Geloescht:
                var geloeschte = ergebnis.Geloeschte!;
                return new Loeschantwort("geloescht", new Listeneintrag(geloeschte.Nummer, geloeschte.Commit, geloeschte.Datei, geloeschte.Zeile, geloeschte.Text), string.Empty);
            case Loeschungsausgang.NichtGefunden:
                return new Loeschantwort("nicht gefunden", null, ergebnis.Grund);
            case Loeschungsausgang.Beendet:
                return new Loeschantwort("beendet", null, ergebnis.Grund);
            default:
                throw new InvalidOperationException($"Unbekannter Ausgang {ergebnis.Ausgang}");
        }
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

internal sealed record Loeschantwort(string Ausgang, Listeneintrag? Geloeschte, string Grund);
