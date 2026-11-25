using GitReviewA.Anmerkungen;
using GitReviewA.Aufruf;
using GitReviewA.Beenden;
using GitReviewA.Diff;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Protokoll;
using GitReviewA.Tests.Hilfen;
using GitReviewA.Zusammen;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Treiber in-process für die Zusammen-Ansicht (R00015): verdrahtet Netto-Liste, Diff, Stapel-Haken und Anmerkung wie der Webserver
/// (echtes git in der Wurzel des Startordners, eine gemerkte Übersicht für Haken, Anmerkung und Netto-Liste, Protokoll auf Stufe Debug)
/// und kennt als einziger ihre Typen. Zählt die Netto-Lesevorgänge.
/// </summary>
internal sealed class ZusammenTreiber
{
    private readonly ZusammenLesenInteractor zusammen;
    private readonly DateiAbhakenInteractor haken;
    private readonly Hakenspeicher hakenspeicher;
    private readonly ZeileAnnotierenInteractor annotieren;
    private readonly Anmerkungsspeicher anmerkungsspeicher;
    private readonly ZaehlendeZusammenquelle quelle;
    private readonly StringWriter protokollziel;

    private ZusammenTreiber(
        ZusammenLesenInteractor zusammen, DateiAbhakenInteractor haken, Hakenspeicher hakenspeicher, ZeileAnnotierenInteractor annotieren,
        Anmerkungsspeicher anmerkungsspeicher, ZaehlendeZusammenquelle quelle, StringWriter protokollziel)
    {
        this.zusammen = zusammen;
        this.haken = haken;
        this.hakenspeicher = hakenspeicher;
        this.annotieren = annotieren;
        this.anmerkungsspeicher = anmerkungsspeicher;
        this.quelle = quelle;
        this.protokollziel = protokollziel;
    }

    public static ZusammenTreiber Starten(string startordner, IEnumerable<string> hashes)
    {
        return Starten(startordner, hashes, Ausgabegrenze.Standard);
    }

    /// <summary>Wie <see cref="Starten(string, IEnumerable{string})"/>, aber mit einer kleinen Ausgabegrenze für die Grenzprobe.</summary>
    public static ZusammenTreiber Starten(string startordner, IEnumerable<string> hashes, Ausgabegrenze grenze)
    {
        var commits = GitLeser.Lesen(new CommitHashes(hashes), startordner);
        var arbeitsordner = GitLeser.WurzelLesen(startordner);
        return Verdrahten(commits, arbeitsordner, new GitUebersichtsquelle(commits, arbeitsordner), grenze);
    }

    /// <summary>Wie <see cref="Starten"/>, aber die Übersicht der Dateien scheitert bei jedem Lesen wie git bei fehlendem Objekt.</summary>
    public static ZusammenTreiber MitUnlesbarerUebersicht(string startordner, IEnumerable<string> hashes)
    {
        var commits = GitLeser.Lesen(new CommitHashes(hashes), startordner);
        var arbeitsordner = GitLeser.WurzelLesen(startordner);
        return Verdrahten(commits, arbeitsordner, new ScheiterndeUebersichtsquelle(), Ausgabegrenze.Standard);
    }

    private static ZusammenTreiber Verdrahten(Commitzeilen commits, string arbeitsordner, IUebersichtsquelle uebersichtsquelle, Ausgabegrenze grenze)
    {
        var protokollziel = new StringWriter();
        var protokoll = new StderrProtokoll(protokollziel, TimeProvider.System, Protokollstufe.Debug);
        var uebersicht = new GemerkteUebersicht(uebersichtsquelle);
        var quelle = new ZaehlendeZusammenquelle(new GitZusammenquelle(commits, arbeitsordner, grenze));
        var zusammen = new ZusammenLesenInteractor(commits, uebersicht, quelle, new GitDiffquelle(arbeitsordner, grenze), protokoll);
        var hakenspeicher = new Hakenspeicher();
        var haken = new DateiAbhakenInteractor(uebersicht, hakenspeicher, zusammen, protokoll);
        var anmerkungsspeicher = new Anmerkungsspeicher();
        var annotieren = new ZeileAnnotierenInteractor(anmerkungsspeicher, new CommitAuswahl(commits), new Stellensperre(uebersicht, protokoll), protokoll);
        return new ZusammenTreiber(zusammen, haken, hakenspeicher, annotieren, anmerkungsspeicher, quelle, protokollziel);
    }

    public Zusammenstand Stand()
    {
        return zusammen.Stand();
    }

    public ZusammenDiffergebnis Diff(string pfad, Diffumfang umfang, Leerraum leerraum)
    {
        return zusammen.Diff(new Zusammenanfrage(pfad, umfang, leerraum));
    }

    public Hakenergebnis Hake(string? commit, string datei, bool abgehakt)
    {
        return haken.Setze(new Hakenanfrage(commit, datei, abgehakt));
    }

    public AnnotierenErgebnis Annotiere(string commit, string datei, int zeile)
    {
        return annotieren.LegeAn(new NeueAnmerkung(commit, datei, zeile, "Prüfen"));
    }

    public Hakenstand Hakenstand()
    {
        return haken.Stand();
    }

    /// <summary>Wie „Beenden“: schließt beide Speicher ab und liefert das Ergebnis, das auf stdout ginge.</summary>
    public string Beenden()
    {
        anmerkungsspeicher.VersucheAbzuschliessen();
        hakenspeicher.VersucheZuSiegeln();
        return ErgebnisFormatierer.Formatiere(anmerkungsspeicher.Schnappschuss(), haken.Ergebnisstand());
    }

    public int NettoLesevorgaenge => quelle.NettoLesevorgaenge;

    public int NettoDiffLesevorgaenge => quelle.NettoDiffLesevorgaenge;

    public string[] Protokollzeilen()
    {
        return protokollziel.ToString().Split('\n', StringSplitOptions.RemoveEmptyEntries);
    }

    private sealed class ZaehlendeZusammenquelle(IZusammenquelle innere) : IZusammenquelle
    {
        public int NettoLesevorgaenge { get; private set; }

        public int NettoDiffLesevorgaenge { get; private set; }

        public Elternfolge Elternfolge()
        {
            return innere.Elternfolge();
        }

        public Dateiaenderungen NettoDateien(string basis, string spitze)
        {
            NettoLesevorgaenge++;
            return innere.NettoDateien(basis, spitze);
        }

        public string NettoDiff(string basis, string spitze, Dateiaenderung datei, Diffumfang umfang, Leerraum leerraum)
        {
            NettoDiffLesevorgaenge++;
            return innere.NettoDiff(basis, spitze, datei, umfang, leerraum);
        }
    }

    private sealed class ScheiterndeUebersichtsquelle : IUebersichtsquelle
    {
        public Dateiuebersicht Lesen()
        {
            throw new GitFehler("git log (Übersicht von 1 Commits) endete mit 128: fatal: bad object");
        }
    }
}
