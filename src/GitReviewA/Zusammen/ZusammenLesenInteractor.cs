using GitReviewA.Aufruf;
using GitReviewA.Diff;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Protokoll;

namespace GitReviewA.Zusammen;

/// <summary>
/// Interaction „Zusammen-Ansicht lesen“: für die Auswahl die Kette und die Netto-Dateiliste (einmal gelesen — Commits sind
/// unveränderlich) sowie je Datei den Diff (bei Bedarf). Lückenlos ist der Diff netto gegen den Elternstand des ältesten Commits,
/// sonst je Commit ein Abschnitt in Auswahlreihenfolge. Die Übersicht der Dateien ist dieselbe gemerkte wie für Haken und Anmerkung.
/// </summary>
internal sealed class ZusammenLesenInteractor : INettoDateiliste
{
    private const string Kontext = "Zusammen";
    private const string Anfragekontext = "Anfrage";

    private readonly Commitzeilen commits;
    private readonly CommitHashes auswahl;
    private readonly GemerkteUebersicht uebersicht;
    private readonly IZusammenquelle quelle;
    private readonly IDiffquelle diffquelle;
    private readonly StderrProtokoll protokoll;
    private readonly Lock sperre = new();
    private Zusammenstand? gemerkt;

    public ZusammenLesenInteractor(Commitzeilen commits, GemerkteUebersicht uebersicht, IZusammenquelle quelle, IDiffquelle diffquelle, StderrProtokoll protokoll)
    {
        this.commits = commits;
        this.uebersicht = uebersicht;
        this.quelle = quelle;
        this.diffquelle = diffquelle;
        this.protokoll = protokoll;
        auswahl = HashesDerAuswahl(commits);
    }

    /// <summary>Einmal gelesen: die Netto-Liste hängt nur an unveränderlichen Commits.</summary>
    public Zusammenstand Stand()
    {
        lock (sperre)
        {
            gemerkt ??= Lesen();
            return gemerkt;
        }
    }

    /// <summary>Für den Stapel-Haken: die Einträge der Netto-Liste mit diesem Anzeigepfad; nicht lesbar, wenn der Stand nicht lesbar ist.</summary>
    public NettoDateitreffer DateienMitAnzeigepfad(string anzeigepfad)
    {
        var stand = Stand();
        return new NettoDateitreffer(stand.IstLesbar, stand.Dateien.MitAnzeigepfad(anzeigepfad));
    }

    public ZusammenDiffergebnis Diff(Zusammenanfrage anfrage)
    {
        var stand = Stand();
        if (!stand.IstLesbar)
        {
            return ZusammenDiffergebnis.NichtLesbar;
        }
        var treffer = stand.Dateien.MitAnzeigepfad(anfrage.Pfad);
        if (treffer.Length == 0)
        {
            protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"Diff in Zusammen abgewiesen: Pfad steht nicht in der Netto-Liste (Länge {anfrage.Pfad.Length})");
            return ZusammenDiffergebnis.NichtGefunden;
        }
        if (treffer.Length > 1)
        {
            protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"Diff in Zusammen abgewiesen: mehrere Dateien tragen den Anzeigenamen (Länge {anfrage.Pfad.Length})");
            return ZusammenDiffergebnis.NameNichtLesbar;
        }
        var datei = treffer[0];
        protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"GET /api/zusammen/diff Datei {datei.Anzeigepfad}");
        try
        {
            return ZusammenDiffergebnis.Gelesen(Antwort(datei, stand, anfrage.Umfang));
        }
        catch (GitFehler fehler)
        {
            protokoll.Melde(Protokollstufe.Fehler, Kontext, $"Diff in Zusammen von {datei.Anzeigepfad} nicht lesbar: {fehler.Message}");
            return ZusammenDiffergebnis.NichtLesbar;
        }
    }

    private Zusammenstand Lesen()
    {
        try
        {
            var kette = KetteBeurteilen.Beurteile(quelle.Elternfolge(), auswahl);
            var uebersichtGelesen = uebersicht.Lesen();
            var juengste = Commitreihenfolge.JuengsteZuerst(kette, commits);
            var spitze = Letzter(kette);
            var netto = kette.Lueckenlos ? quelle.NettoDateien(kette.Basis, spitze) : new Dateiaenderungen([]);
            var liste = NettoDateilisteBauen.Baue(kette, netto, uebersichtGelesen, juengste);
            protokoll.Melde(Protokollstufe.Debug, Kontext, $"Netto-Liste gelesen: {liste.Anzahl} Dateien, {liste.Beschriftung}");
            return new Zusammenstand(true, kette.Lueckenlos, kette.Basis, spitze, liste);
        }
        catch (GitFehler fehler)
        {
            protokoll.Melde(Protokollstufe.Fehler, Kontext, $"Zusammen-Ansicht nicht lesbar: {fehler.Message}");
            return new Zusammenstand(false, false, string.Empty, string.Empty, new NettoDateiliste(false, []));
        }
    }

    private ZusammenDiffAntwort Antwort(NettoDatei datei, Zusammenstand stand, Diffumfang umfang)
    {
        if (stand.Lueckenlos)
        {
            var commitsDerDatei = datei.Stellen.Select(stelle => stelle.Commit).ToArray();
            if (Diffaufbereitung.ArtVon(datei.Datei) == Diffaufbereitung.ArtBinaer)
            {
                return Diffaufbereitung.Netto(datei.Datei, string.Empty, diffquelle.BinaerGrund(stand.Spitze, datei.Datei), commitsDerDatei);
            }
            var patch = quelle.NettoDiff(stand.Basis, stand.Spitze, datei.Datei, umfang);
            return Diffaufbereitung.Netto(datei.Datei, patch, null, commitsDerDatei);
        }
        return Diffaufbereitung.Abschnitte(datei.Datei, datei.Stellen.Select(stelle => Abschnitt(stelle, umfang)));
    }

    private Diffabschnitt Abschnitt(NettoStelle stelle, Diffumfang umfang)
    {
        var art = Diffaufbereitung.ArtVon(stelle.Datei);
        if (art == Diffaufbereitung.ArtBinaer)
        {
            return new Diffabschnitt(stelle.Commit, art, diffquelle.BinaerGrund(stelle.Commit, stelle.Datei), string.Empty);
        }
        return new Diffabschnitt(stelle.Commit, art, null, diffquelle.Lesen(stelle.Commit, stelle.Datei, umfang));
    }

    private static CommitHashes HashesDerAuswahl(Commitzeilen commits)
    {
        var hashes = new List<string>(commits.Anzahl);
        foreach (var commit in commits)
        {
            hashes.Add(commit.Hash);
        }
        return new CommitHashes(hashes);
    }

    /// <summary>Der jüngste Commit der Kette in Auswahlreihenfolge; bei nicht lückenloser Auswahl der zuletzt genannte.</summary>
    private static string Letzter(Kette kette)
    {
        var letzter = string.Empty;
        foreach (var hash in kette.Reihenfolge)
        {
            letzter = hash;
        }
        return letzter;
    }
}
