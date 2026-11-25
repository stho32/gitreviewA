using GitReviewA.Anmerkungen;
using GitReviewA.Aufruf;
using GitReviewA.Beenden;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Protokoll;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>Treiber in-process: verdrahtet den Interactor wie der Webserver (Auswahl aus echtem git, Speicher, Protokoll auf Stufe Debug) und kennt als einziger seine Typen.</summary>
internal sealed class ZeileAnnotierenTreiber
{
    private readonly ZeileAnnotierenInteractor interactor;
    private readonly Anmerkungsspeicher speicher;
    private readonly StringWriter protokollziel;
    private readonly ErgebnisKopierenInteractor ergebnis;
    private readonly AnmerkungAendernInteractor aendern;
    private readonly AnmerkungLoeschenInteractor loeschen;

    private ZeileAnnotierenTreiber(ZeileAnnotierenInteractor interactor, Anmerkungsspeicher speicher, StringWriter protokollziel, ErgebnisKopierenInteractor ergebnis, AnmerkungAendernInteractor aendern, AnmerkungLoeschenInteractor loeschen)
    {
        this.interactor = interactor;
        this.speicher = speicher;
        this.protokollziel = protokollziel;
        this.ergebnis = ergebnis;
        this.aendern = aendern;
        this.loeschen = loeschen;
    }

    public static ZeileAnnotierenTreiber Starten(string startordner, IEnumerable<string> hashes)
    {
        return Starten(startordner, hashes, Ausgabegrenze.Standard);
    }

    /// <summary>Mit eigener Ausgabegrenze für den Lesepfad der markierten Zeilen (R00031, Grenzprobe).</summary>
    public static ZeileAnnotierenTreiber Starten(string startordner, IEnumerable<string> hashes, Ausgabegrenze grenze)
    {
        var commits = GitLeser.Lesen(new CommitHashes(hashes), startordner);
        var arbeitsordner = GitLeser.WurzelLesen(startordner);
        var protokollziel = new StringWriter();
        var protokoll = new StderrProtokoll(protokollziel, TimeProvider.System, Protokollstufe.Debug);
        var speicher = new Anmerkungsspeicher();
        var uebersicht = new GemerkteUebersicht(new GitUebersichtsquelle(commits, arbeitsordner));
        var sperre = new Stellensperre(uebersicht, protokoll);
        var interactor = new ZeileAnnotierenInteractor(speicher, new CommitAuswahl(commits), sperre, protokoll);
        // Dieselbe Erzeugungsstelle wie der Webserver: der Lesepfad der markierten Zeilen hängt am Beenden (R00031).
        var bereichszeilen = new Bereichszeilen(uebersicht, arbeitsordner, grenze, protokoll);
        var dateiAbhaken = new DateiAbhakenInteractor(uebersicht, new Hakenspeicher(), TestNettoDateiliste.Leer(), protokoll);
        return new ZeileAnnotierenTreiber(
            interactor,
            speicher,
            protokollziel,
            new ErgebnisKopierenInteractor(speicher, dateiAbhaken, bereichszeilen),
            new AnmerkungAendernInteractor(speicher, sperre, protokoll),
            new AnmerkungLoeschenInteractor(speicher, protokoll));
    }

    public Anlegeantwort LegeAn(string commit, string datei, int zeile, string text)
    {
        return LegeAn(new NeueAnmerkung(commit, datei, zeile, text));
    }

    /// <summary>Eine Bereichsanmerkung (R00031): derselbe Interactor, `von`/`bis` statt `zeile`.</summary>
    public Anlegeantwort LegeAnBereich(string commit, string datei, int von, int bis, string text)
    {
        return LegeAn(new NeueAnmerkung(commit, datei, null, text, von, bis));
    }

    /// <summary>Ein bewusst widersprüchlicher Request (R00031): `zeile` und `von`/`bis` zusammen.</summary>
    public Anlegeantwort LegeAnMitZeileUndBereich(string commit, string datei, int zeile, int von, int bis, string text)
    {
        return LegeAn(new NeueAnmerkung(commit, datei, zeile, text, von, bis));
    }

    private Anlegeantwort LegeAn(NeueAnmerkung neu)
    {
        var ergebnis = interactor.LegeAn(neu);
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

    /// <summary>Den Text einer Anmerkung über ihre stabile Nummer ändern (R00018/I0023); liefert die geänderte Anmerkung.</summary>
    public Aenderantwort Aendere(int nummer, string text)
    {
        var ergebnis = aendern.Aendere(new Aenderungswunsch(nummer, text));
        var geaendert = ergebnis.Geaenderte;
        return new Aenderantwort(AusgangAlsWort(ergebnis.Ausgang), geaendert is null ? null : AlsEintrag(geaendert), ergebnis.Grund);
    }

    /// <summary>Eine Anmerkung über ihre stabile Nummer löschen (R00019/I0024); liefert die gelöschte Anmerkung.</summary>
    public Loeschantwort Loesche(int nummer)
    {
        var ergebnis = loeschen.Loesche(new Loeschungswunsch(nummer));
        var geloescht = ergebnis.Geloeschte;
        return new Loeschantwort(AusgangAlsWort(ergebnis.Ausgang), geloescht is null ? null : AlsEintrag(geloescht), ergebnis.Grund);
    }

    private static Listeneintrag AlsEintrag(Anmerkung anmerkung)
    {
        return new Listeneintrag(anmerkung.Nummer, anmerkung.Commit, anmerkung.Datei, anmerkung.Zeile, anmerkung.Text, anmerkung.Von, anmerkung.Bis, anmerkung.Art);
    }

    private static string AusgangAlsWort(Aenderungsausgang ausgang)
    {
        return ausgang switch
        {
            Aenderungsausgang.Geaendert => "geaendert",
            Aenderungsausgang.NichtGefunden => "nicht gefunden",
            Aenderungsausgang.Beendet => "beendet",
            _ => "ungueltig",
        };
    }

    private static string AusgangAlsWort(Loeschungsausgang ausgang)
    {
        return ausgang switch
        {
            Loeschungsausgang.Geloescht => "geloescht",
            Loeschungsausgang.NichtGefunden => "nicht gefunden",
            Loeschungsausgang.Beendet => "beendet",
            _ => "ungueltig",
        };
    }

    public Listeneintrag[] Liste()
    {
        var eintraege = new List<Listeneintrag>();
        foreach (var anmerkung in interactor.Liste())
        {
            eintraege.Add(new Listeneintrag(anmerkung.Nummer, anmerkung.Commit, anmerkung.Datei, anmerkung.Zeile, anmerkung.Text, anmerkung.Von, anmerkung.Bis, anmerkung.Art));
        }
        return eintraege.ToArray();
    }

    /// <summary>Wie „Beenden“: schließt den Speicher ab und liefert das Ergebnis, das auf stdout ginge (mit den Zitaten der Bereiche).</summary>
    public string Beenden()
    {
        speicher.VersucheAbzuschliessen();
        return ergebnis.Erzeuge().Ergebnis;
    }

    public string Protokoll()
    {
        return protokollziel.ToString();
    }
}

internal sealed record Anlegeantwort(string Ausgang, int? Nummer, string Grund);

internal sealed record Listeneintrag(int Nummer, string Commit, string Datei, int? Zeile, string Text, int? Von = null, int? Bis = null, Art? Art = null);

