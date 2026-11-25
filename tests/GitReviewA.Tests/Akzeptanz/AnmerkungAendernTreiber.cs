using System.Text.Json;
using GitReviewA.Anmerkungen;
using GitReviewA.Aufruf;
using GitReviewA.Beenden;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Protokoll;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Treiber in-process für R00018: verdrahtet Anlegen und Ändern wie der Webserver auf einem Speicher und einer gemerkten Übersicht;
/// die Änderung bekommt je Aufruf einen frischen Interactor wie eine Anfrage. Die Stelleprüfung lässt sich durch eine feste Übersicht
/// ersetzen — in der Anwendung ist die gesperrte Stelle beim Ändern nicht erreichbar (R00018 Kriterium 8).
/// </summary>
internal sealed class AnmerkungAendernTreiber
{
    private readonly ZeileAnnotierenInteractor anlegen;
    private readonly Anmerkungsspeicher speicher;
    private readonly StderrProtokoll protokoll;
    private readonly StringWriter protokollziel;
    private Stellensperre sperre;

    private AnmerkungAendernTreiber(ZeileAnnotierenInteractor anlegen, Anmerkungsspeicher speicher, Stellensperre sperre, StderrProtokoll protokoll, StringWriter protokollziel)
    {
        this.anlegen = anlegen;
        this.speicher = speicher;
        this.sperre = sperre;
        this.protokoll = protokoll;
        this.protokollziel = protokollziel;
    }

    public static AnmerkungAendernTreiber Starten(string startordner, IEnumerable<string> hashes)
    {
        var commits = GitLeser.Lesen(new CommitHashes(hashes), startordner);
        var arbeitsordner = GitLeser.WurzelLesen(startordner);
        var protokollziel = new StringWriter();
        var protokoll = new StderrProtokoll(protokollziel, TimeProvider.System, Protokollstufe.Debug);
        var speicher = new Anmerkungsspeicher();
        var uebersicht = new GemerkteUebersicht(new GitUebersichtsquelle(commits, arbeitsordner));
        var sperre = new Stellensperre(uebersicht, protokoll);
        var anlegen = new ZeileAnnotierenInteractor(speicher, new CommitAuswahl(commits), sperre, protokoll);
        return new AnmerkungAendernTreiber(anlegen, speicher, sperre, protokoll, protokollziel);
    }

    public void SperreDurchFesteUebersicht(IUebersichtsquelle quelle)
    {
        sperre = new Stellensperre(new GemerkteUebersicht(quelle), protokoll);
    }

    public Anlegeantwort LegeAn(string commit, string datei, int? zeile, string text, JsonElement art = default)
    {
        var ergebnis = anlegen.LegeAn(new NeueAnmerkung(commit, datei, zeile, text, Art: art));
        switch (ergebnis.Ausgang)
        {
            case Annotierenausgang.Angelegt:
                return new Anlegeantwort("angelegt", ergebnis.Angelegt!.Nummer, "");
            case Annotierenausgang.Ungueltig:
                return new Anlegeantwort("ungültig", null, ergebnis.Grund);
            case Annotierenausgang.Beendet:
                return new Anlegeantwort("beendet", null, ergebnis.Grund);
            default:
                throw new InvalidOperationException($"Unbekannter Ausgang {ergebnis.Ausgang}");
        }
    }

    /// <summary>Ändert den Text; ohne `art` im Körper bleibt die gespeicherte Art (R00036).</summary>
    public Aenderantwort Aendere(int nummer, string text)
    {
        return AlsAntwort(new AnmerkungAendernInteractor(speicher, sperre, protokoll).Aendere(new Aenderungswunsch(nummer, text)));
    }

    /// <summary>Setzt oder wechselt die Art (R00036).</summary>
    public Aenderantwort AendereMitArt(int nummer, string text, string art)
    {
        return AlsAntwort(new AnmerkungAendernInteractor(speicher, sperre, protokoll).Aendere(new Aenderungswunsch(nummer, text, JsonSerializer.SerializeToElement(art))));
    }

    /// <summary>Entfernt die Art mit ausdrücklichem `null` (R00036).</summary>
    public Aenderantwort AendereOhneArt(int nummer, string text)
    {
        return AlsAntwort(new AnmerkungAendernInteractor(speicher, sperre, protokoll).Aendere(new Aenderungswunsch(nummer, text, JsonSerializer.SerializeToElement<string?>(null))));
    }

    /// <summary>Eine Art, die keine ist — roh in den Körper, wie eine fremde Anfrage (R00036 Kriterium 4).</summary>
    public Aenderantwort AendereMitRohart(int nummer, string text, string roh)
    {
        using var dokument = JsonDocument.Parse(roh);
        return AlsAntwort(new AnmerkungAendernInteractor(speicher, sperre, protokoll).Aendere(new Aenderungswunsch(nummer, text, dokument.RootElement)));
    }

    /// <summary>Ein Körper, der keine Änderung ist — wie ein JSON-Objekt ohne Text.</summary>
    public Aenderantwort AendereOhneWunsch()
    {
        return AlsAntwort(new AnmerkungAendernInteractor(speicher, sperre, protokoll).Aendere(null));
    }

    /// <summary>Wie <see cref="Aendere"/>, aber mit einem Speicher, der das Ersetzen als „nicht gefunden“ meldet — der Zwischenzustand, in dem die
        /// Anmerkung zwischen Finden und Ersetzen wegfällt (Löschen, I0024). Die Probe stellt ihn ohne Wettlauf deterministisch.</summary>
    public Aenderantwort AendereMitVerschwundenerAnmerkung(int nummer, string text)
    {
        var stolpernd = new SpeicherOhneErsetzen();
        foreach (var anmerkung in speicher.Schnappschuss())
        {
            stolpernd.VersucheAnzuhaengen(new GepruefteAnmerkung(anmerkung.Commit, anmerkung.Datei, anmerkung.Zeile, anmerkung.Text, anmerkung.Von, anmerkung.Bis, anmerkung.Art), out _);
        }
        return AlsAntwort(new AnmerkungAendernInteractor(stolpernd, sperre, protokoll).Aendere(new Aenderungswunsch(nummer, text)));
    }

    /// <summary>Ein Speicher, in dem die Anmerkung beim Ersetzen fehlt — ohne den Löschweg (I0024).</summary>
    private sealed class SpeicherOhneErsetzen : Anmerkungsspeicher
    {
        public override Aenderungsausgang VersucheZuAendern(int nummer, string text, Artangabe art, out Anmerkung? geaendert)
        {
            geaendert = null;
            return Aenderungsausgang.NichtGefunden;
        }
    }

    public Listeneintrag[] Liste()
    {
        var eintraege = new List<Listeneintrag>();
        foreach (var anmerkung in anlegen.Liste())
        {
            eintraege.Add(new Listeneintrag(anmerkung.Nummer, anmerkung.Commit, anmerkung.Datei, anmerkung.Zeile, anmerkung.Text, anmerkung.Von, anmerkung.Bis, anmerkung.Art));
        }
        return eintraege.ToArray();
    }

    /// <summary>Wie „Beenden“: schließt den Speicher ab und liefert das Ergebnis, das auf stdout ginge.</summary>
    public string Beenden()
    {
        speicher.VersucheAbzuschliessen();
        return Ergebnis();
    }

    /// <summary>Das Ergebnis, ohne den Lauf zu beenden — derselbe Formatierer wie „Beenden“ und „Ergebnis kopieren“.</summary>
    public string Ergebnis()
    {
        return ErgebnisFormatierer.Formatiere(speicher.Schnappschuss(), new Dateienstand([]));
    }

    public string Protokoll()
    {
        return protokollziel.ToString();
    }

    private static Aenderantwort AlsAntwort(Aenderungsergebnis ergebnis)
    {
        switch (ergebnis.Ausgang)
        {
            case Aenderungsausgang.Geaendert:
                var geaenderte = ergebnis.Geaenderte!;
                return new Aenderantwort("geändert", new Listeneintrag(geaenderte.Nummer, geaenderte.Commit, geaenderte.Datei, geaenderte.Zeile, geaenderte.Text, geaenderte.Von, geaenderte.Bis, geaenderte.Art), "");
            case Aenderungsausgang.Ungueltig:
                return new Aenderantwort("ungültig", null, ergebnis.Grund);
            case Aenderungsausgang.NichtGefunden:
                return new Aenderantwort("nicht gefunden", null, ergebnis.Grund);
            case Aenderungsausgang.Beendet:
                return new Aenderantwort("beendet", null, ergebnis.Grund);
            default:
                throw new InvalidOperationException($"Unbekannter Ausgang {ergebnis.Ausgang}");
        }
    }
}

internal sealed record Aenderantwort(string Ausgang, Listeneintrag? Geaendert, string Grund);