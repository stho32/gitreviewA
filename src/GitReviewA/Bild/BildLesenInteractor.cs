using GitReviewA.Dateien;
using GitReviewA.Diff;
using GitReviewA.Git;
using GitReviewA.Protokoll;

namespace GitReviewA.Bild;

/// <summary>
/// Interaction „Bild einer Datei lesen“: git bekommt nur einen vollen Hash der Auswahl und einen Pfad, der genau so in der
/// Dateiliste dieses Commits steht — alles andere endet vorher als <see cref="Bildausgang.NichtGefunden"/>. Eine Textdatei
/// (die nie ein Bild sein kann) und eine Seite, die es nicht gibt (neu/gelöscht), werden ohne `git`-Aufruf abgewiesen; die
/// Bytes liest die Quelle nur mit Ausgabegrenze und Namensprüfung. Der Typ kommt am Inhalt erkannt aus der festen Liste.
/// </summary>
internal sealed class BildLesenInteractor(Commitzeilen commits, GemerkteDateiquelle dateien, IBildquelle quelle, StderrProtokoll protokoll)
{
    private const string Anfragekontext = "Anfrage";
    private const string Fehlerkontext = "Bild";

    private readonly Dictionary<string, string> hashNachSchreibweise = HashesDerAuswahl(commits);

    public Bildergebnis Lesen(Bildanfrage anfrage)
    {
        var istHashDerAuswahl = hashNachSchreibweise.TryGetValue(anfrage.Hash, out var hash);
        if (!istHashDerAuswahl || hash is null)
        {
            return Bildergebnis.NichtGefunden;
        }
        Dateiaenderungen dateienDesCommits;
        try
        {
            dateienDesCommits = dateien.GemerktOderGelesen(hash);
        }
        catch (GitFehler fehler)
        {
            protokoll.Melde(Protokollstufe.Fehler, Fehlerkontext, $"Dateiliste von Commit {hash} für das Bild nicht lesbar: {fehler.Message}");
            return Bildergebnis.NichtLesbar;
        }
        var treffer = Namenspruefung.Pruefe(dateienDesCommits, anfrage.Pfad);
        var datei = treffer.Datei;
        if (datei is null)
        {
            return Abgewiesen(hash, anfrage, treffer.Fall);
        }
        if (IstText(datei))
        {
            return KeinBildMitGrund(hash, datei, "die Datei ist Text, kein Bild");
        }
        if (!SeiteVorhanden(datei, anfrage.Seite))
        {
            return KeinBildMitGrund(hash, datei, $"die Seite {anfrage.Seite} gibt es nicht");
        }
        byte[] bytes;
        try
        {
            bytes = quelle.Lesen(hash, datei, anfrage.Seite);
        }
        catch (GitZuGross zuGross)
        {
            protokoll.Melde(Protokollstufe.Warnung, Fehlerkontext, $"Bild von Commit {hash} zu groß: Ausgabegrenze von {zuGross.Grenze} Byte überschritten");
            return Bildergebnis.ZuGross(zuGross.Grenze);
        }
        catch (GitFehler fehler)
        {
            protokoll.Melde(Protokollstufe.Fehler, Fehlerkontext, $"Bild von Commit {hash} nicht lesbar: {fehler.Message}");
            return Bildergebnis.NichtLesbar;
        }
        var art = Bildbestimmung.Art(bytes);
        if (art is null)
        {
            return KeinBildMitGrund(hash, datei, "der Inhalt ist keiner der festen Bildtypen");
        }
        protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"GET /api/commits/{hash}/bild Seite {anfrage.Seite} Datei (Länge {datei.Pfad.Length}) Typ {art} Größe {bytes.Length}");
        return Bildergebnis.Gelesen(new Bildantwort(art.Value, bytes));
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

    /// <summary>Eine Textdatei kann nie ein Bild sein — die Bytes werden dafür nicht gelesen.</summary>
    private static bool IstText(Dateiaenderung datei)
    {
        return Diffaufbereitung.ArtVon(datei) == Diffaufbereitung.ArtText;
    }

    /// <summary>`vorher` gibt es bei einer neuen Datei (`A`) nicht, `nachher` bei einer gelöschten (`D`) nicht.</summary>
    private static bool SeiteVorhanden(Dateiaenderung datei, Bildseite seite)
    {
        var istNeu = datei.Status == "A";
        var istGeloescht = datei.Status == "D";
        if (seite == Bildseite.Vorher)
        {
            return !istNeu;
        }
        return !istGeloescht;
    }

    private Bildergebnis KeinBildMitGrund(string hash, Dateiaenderung datei, string grund)
    {
        protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"Bild von Commit {hash} abgewiesen: {grund} (Länge {datei.Pfad.Length})");
        return Bildergebnis.KeinBild;
    }

    private Bildergebnis Abgewiesen(string hash, Bildanfrage anfrage, Namensfall fall)
    {
        switch (fall)
        {
            case Namensfall.NichtGefunden:
                protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"Bild von Commit {hash} abgewiesen: Pfad steht nicht in der Dateiliste (Länge {anfrage.Pfad.Length})");
                return Bildergebnis.NichtGefunden;
            case Namensfall.NichtEindeutig:
                protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"Bild von Commit {hash} abgewiesen: mehrere Dateien tragen den Namen (Länge {anfrage.Pfad.Length})");
                return Bildergebnis.NameNichtLesbar;
            case Namensfall.NichtUebergebbar:
                protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"Bild von Commit {hash} abgewiesen: Name mit ungültigem Byte und Zeilenende (Länge {anfrage.Pfad.Length})");
                return Bildergebnis.NameNichtLesbar;
            default:
                throw new InvalidOperationException($"Unbekannter Namensfall {fall}");
        }
    }
}
