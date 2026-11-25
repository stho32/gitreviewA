using GitReviewA.Dateien;
using GitReviewA.Diff;
using GitReviewA.Fremdtext;
using GitReviewA.Git;
using GitReviewA.Protokoll;

namespace GitReviewA.Sprung;

/// <summary>
/// Interaction „In VS Code springen“: git bekommt nur einen vollen Hash der Auswahl und einen Pfad, der genau so in der Dateiliste
/// dieses Commits steht — alles andere endet vorher als <see cref="Sprungausgang.NichtGefunden"/>. Ein Name, der keine Datei
/// eindeutig meint oder sich nicht übergeben lässt, und jeder Ablehnungsgrund aus <see cref="Sprungpfad"/> oder dem Arbeitsbaum
/// enden vor jedem git-Aufruf; die Antwort nennt dann den Grund statt eines Ziels. Sonst steht das kodierte Ziel ohne Zeile bereit
/// und `Geaendert` sagt, ob der Arbeitsbaum vom Commit abweicht.
/// </summary>
internal sealed class SprungInteractor(Commitzeilen commits, GemerkteDateiquelle dateien, ISprungquelle quelle, StderrProtokoll protokoll)
{
    private const string Anfragekontext = "Anfrage";
    private const string Fehlerkontext = "Sprung";

    private readonly Dictionary<string, string> hashNachSchreibweise = HashesDerAuswahl(commits);

    public Sprungergebnis Lesen(Sprunganfrage anfrage)
    {
        var istHashDerAuswahl = hashNachSchreibweise.TryGetValue(anfrage.Hash, out var hash);
        if (!istHashDerAuswahl || hash is null)
        {
            return Sprungergebnis.NichtGefunden;
        }
        Dateiaenderungen dateienDesCommits;
        try
        {
            dateienDesCommits = dateien.GemerktOderGelesen(hash);
        }
        catch (GitFehler fehler)
        {
            protokoll.Melde(Protokollstufe.Warnung, Fehlerkontext, $"Dateiliste von Commit {hash} für den Sprung nicht lesbar: {fehler.Message}");
            return Sprungergebnis.NichtGefunden;
        }
        var treffer = Namenspruefung.Pruefe(dateienDesCommits, anfrage.Pfad);
        if (treffer.Datei is null)
        {
            return AbgewiesenOhneGit(hash, anfrage, treffer.Fall);
        }
        var datei = treffer.Datei;
        var pfad = Sprungpfad.Bilde(datei, quelle.Repositorywurzel);
        var istSprung = pfad.Ablehnung == Sprungablehnung.Keine;
        if (!istSprung)
        {
            return AbgewiesenOhneGit(hash, datei, Sprunggruende.Aus(pfad.Ablehnung));
        }
        var vorhanden = quelle.PruefeVorhandensein(pfad.AbsoluterPfad!);
        if (vorhanden != Sprungvorhandensein.Vorhanden)
        {
            return AbgewiesenOhneGit(hash, datei, GrundImArbeitsbaum(vorhanden));
        }
        return BeantworteMitZiel(hash, datei, pfad.AbsoluterPfad!);
    }

    private Dateiaenderungen DateienDesCommits(string hash)
    {
        try
        {
            return dateien.GemerktOderGelesen(hash);
        }
        catch (GitFehler fehler)
        {
            protokoll.Melde(Protokollstufe.Fehler, Fehlerkontext, $"Dateiliste von Commit {hash} für den Sprung nicht lesbar: {fehler.Message}");
            return new Dateiaenderungen([]);
        }
    }

    /// <summary>Ein Name, der keine Datei meint, endet als 404; Doppeldeutigkeit und fehlende Übergabefähigkeit als Grund ohne git.</summary>
    private Sprungergebnis AbgewiesenOhneGit(string hash, Sprunganfrage anfrage, Namensfall fall)
    {
        switch (fall)
        {
            case Namensfall.NichtGefunden:
                protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"Sprung von Commit {hash} abgewiesen: Pfad steht nicht in der Dateiliste (Länge {anfrage.Pfad.Length})");
                return Sprungergebnis.NichtGefunden;
            case Namensfall.NichtEindeutig:
                return AbgewiesenOhneGit(hash, anfrage, Sprunggruende.NameNichtEindeutig);
            case Namensfall.NichtUebergebbar:
                return AbgewiesenOhneGit(hash, anfrage, Sprunggruende.NameNichtUebergebbar);
            default:
                throw new InvalidOperationException($"Unbekannter Namensfall {fall}");
        }
    }

    private Sprungergebnis AbgewiesenOhneGit(string hash, Sprunganfrage anfrage, string grund)
    {
        protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"Sprung von Commit {hash} abgewiesen: {grund} (Länge {anfrage.Pfad.Length})");
        return Sprungergebnis.KeinSprung(grund);
    }

    private Sprungergebnis AbgewiesenOhneGit(string hash, Dateiaenderung datei, string grund)
    {
        protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"Sprung von Commit {hash} abgewiesen: {grund} (Datei {UnsichtbareZeichen.AlsMarken(datei.Pfad)})");
        return Sprungergebnis.KeinSprung(grund);
    }

    private static string GrundImArbeitsbaum(Sprungvorhandensein vorhanden)
    {
        if (vorhanden == Sprungvorhandensein.VerlaesstWurzel)
        {
            return Sprunggruende.PfadVerlaesstRepository;
        }
        return Sprunggruende.DateiFehlt;
    }

    private Sprungergebnis BeantworteMitZiel(string hash, Dateiaenderung datei, string absoluterPfad)
    {
        bool geaendert;
        try
        {
            geaendert = quelle.IstGeaendertSeit(hash, datei);
        }
        catch (GitFehler fehler)
        {
            protokoll.Melde(Protokollstufe.Fehler, Fehlerkontext, $"Arbeitsbaum von Commit {hash}, Datei {UnsichtbareZeichen.AlsMarken(datei.Pfad)} nicht prüfbar: {fehler.Message}");
            return Sprungergebnis.NichtLesbar;
        }
        protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"GET /api/commits/{hash}/sprung Datei {UnsichtbareZeichen.AlsMarken(datei.Pfad)}");
        return Sprungergebnis.Sprung(Sprungziel.Fuer(absoluterPfad), geaendert);
    }

    private static Dictionary<string, string> HashesDerAuswahl(Commitzeilen commits)
    {
        var auswahl = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var commit in commits)
        {
            auswahl[commit.Hash] = commit.Hash;
        }
        return auswahl;
    }
}
