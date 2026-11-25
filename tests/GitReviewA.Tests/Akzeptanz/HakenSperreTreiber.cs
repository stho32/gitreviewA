using GitReviewA.Anmerkungen;
using GitReviewA.Aufruf;
using GitReviewA.Beenden;
using GitReviewA.Dateien;
using GitReviewA.Diff;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Protokoll;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Treiber in-process für R00014: verdrahtet „Datei abhaken“, „Zeile annotieren“ und „Diff lesen“ wie der Webserver (eine Auswahl, eine
/// gemerkte Übersicht aus echtem git für Haken und Anmerkung, Protokoll auf Stufe Debug) und kennt als einziger ihre Typen.
/// </summary>
internal sealed class HakenSperreTreiber
{
    private readonly DateiAbhakenInteractor haken;
    private readonly Hakenspeicher hakenspeicher;
    private readonly ZeileAnnotierenInteractor annotieren;
    private readonly Anmerkungsspeicher anmerkungsspeicher;
    private readonly DiffLesenInteractor diff;
    private readonly StringWriter protokollziel;

    private HakenSperreTreiber(
        DateiAbhakenInteractor haken, Hakenspeicher hakenspeicher, ZeileAnnotierenInteractor annotieren, Anmerkungsspeicher anmerkungsspeicher,
        DiffLesenInteractor diff, StringWriter protokollziel)
    {
        this.haken = haken;
        this.hakenspeicher = hakenspeicher;
        this.annotieren = annotieren;
        this.anmerkungsspeicher = anmerkungsspeicher;
        this.diff = diff;
        this.protokollziel = protokollziel;
    }

    public static HakenSperreTreiber Starten(string startordner, IEnumerable<string> hashes)
    {
        var commits = GitLeser.Lesen(new CommitHashes(hashes), startordner);
        var arbeitsordner = GitLeser.WurzelLesen(startordner);
        return Verdrahten(commits, arbeitsordner, new GitUebersichtsquelle(commits, arbeitsordner));
    }

    /// <summary>Wie <see cref="Starten"/>, aber die Übersicht der Dateien scheitert bei jedem Lesen wie git bei fehlendem Objekt.</summary>
    public static HakenSperreTreiber MitUnlesbarerUebersicht(string startordner, IEnumerable<string> hashes)
    {
        var commits = GitLeser.Lesen(new CommitHashes(hashes), startordner);
        var arbeitsordner = GitLeser.WurzelLesen(startordner);
        return Verdrahten(commits, arbeitsordner, new ScheiterndeUebersichtsquelle());
    }

    private static HakenSperreTreiber Verdrahten(Commitzeilen commits, string arbeitsordner, IUebersichtsquelle uebersichtsquelle)
    {
        var protokollziel = new StringWriter();
        var protokoll = new StderrProtokoll(protokollziel, TimeProvider.System, Protokollstufe.Debug);
        var uebersicht = new GemerkteUebersicht(uebersichtsquelle);
        var hakenspeicher = new Hakenspeicher();
        var haken = new DateiAbhakenInteractor(uebersicht, hakenspeicher, TestNettoDateiliste.Leer(), protokoll);
        var anmerkungsspeicher = new Anmerkungsspeicher();
        var annotieren = new ZeileAnnotierenInteractor(anmerkungsspeicher, new CommitAuswahl(commits), new Stellensperre(uebersicht, protokoll), protokoll);
        var dateien = new GemerkteDateiquelle(new GitDateiquelle(arbeitsordner));
        var diff = new DiffLesenInteractor(commits, dateien, new GitDiffquelle(arbeitsordner), protokoll);
        return new HakenSperreTreiber(haken, hakenspeicher, annotieren, anmerkungsspeicher, diff, protokollziel);
    }

    public Hakenantwort Setze(string commit, string datei, bool abgehakt)
    {
        var ergebnis = haken.Setze(new Hakenanfrage(commit, datei, abgehakt));
        return new Hakenantwort(HakenausgangAlsWort(ergebnis.Ausgang), ergebnis.Abgehakt, ergebnis.Gesamt, ergebnis.Grund);
    }

    public Anlegeantwort LegeAn(string commit, string datei, int zeile, string text)
    {
        return LegeAn(commit, datei, (int?)zeile, text);
    }

    /// <summary>Eine Dateianmerkung anlegen: derselbe Request ohne `zeile` (R00022).</summary>
    public Anlegeantwort LegeAnAlsDatei(string commit, string datei, string text)
    {
        return LegeAn(commit, datei, null, text);
    }

    private Anlegeantwort LegeAn(string commit, string datei, int? zeile, string text)
    {
        var ergebnis = annotieren.LegeAn(new NeueAnmerkung(commit, datei, zeile, text));
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

    /// <summary>Die Anmerkungen als „Datei:Zeile“ in der Reihenfolge ihrer Nummer.</summary>
    public string[] Anmerkungsstellen()
    {
        var stellen = new List<string>();
        foreach (var anmerkung in annotieren.Liste())
        {
            stellen.Add($"{anmerkung.Nummer}. {anmerkung.Datei}:{anmerkung.Zeile}");
        }
        return stellen.ToArray();
    }

    public Standantwort Stand()
    {
        var stand = haken.Stand();
        var stellen = new List<Stellenstand>();
        foreach (var stelle in stand.Dateien)
        {
            stellen.Add(stelle);
        }
        return new Standantwort(stand.IstLesbar, stand.Dateien.Abgehakt, stand.Dateien.Gesamt, stellen.ToArray());
    }

    public Dateiansicht Diff(string commit, string datei)
    {
        return Dateiansicht.Aus(diff.Lesen(new Diffanfrage(commit, datei, false, Diffumfang.Aenderungen)));
    }

    /// <summary>Wie „Beenden“: schließt beide Speicher ab und liefert das Ergebnis, das auf stdout ginge.</summary>
    public string Beenden()
    {
        anmerkungsspeicher.VersucheAbzuschliessen();
        hakenspeicher.VersucheZuSiegeln();
        return ErgebnisFormatierer.Formatiere(anmerkungsspeicher.Schnappschuss(), haken.Ergebnisstand());
    }

    public string[] Protokollzeilen()
    {
        return protokollziel.ToString().Split('\n', StringSplitOptions.RemoveEmptyEntries);
    }

    private static string HakenausgangAlsWort(Hakenausgang ausgang)
    {
        switch (ausgang)
        {
            case Hakenausgang.Gesetzt:
                return "gesetzt";
            case Hakenausgang.Ungueltig:
                return "ungültig";
            case Hakenausgang.Beendet:
                return "beendet";
            case Hakenausgang.NichtLesbar:
                return "nicht lesbar";
            default:
                throw new InvalidOperationException($"Unbekannter Ausgang {ausgang}");
        }
    }

    private sealed class ScheiterndeUebersichtsquelle : IUebersichtsquelle
    {
        public Dateiuebersicht Lesen()
        {
            throw new GitFehler("git log (Übersicht von 2 Commits) endete mit 128: fatal: bad object");
        }
    }
}
