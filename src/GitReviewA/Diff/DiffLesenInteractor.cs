using GitReviewA.Dateien;
using GitReviewA.Git;
using GitReviewA.Protokoll;

namespace GitReviewA.Diff;

/// <summary>
/// Interaction „Diff einer Datei lesen“: git bekommt nur einen vollen Hash der Auswahl und einen Pfad, der genau so in der Dateiliste
/// dieses Commits steht — alles andere endet vorher als <see cref="Diffausgang.NichtGefunden"/>. Ein Name, der keine Datei eindeutig meint
/// oder sich nicht an git übergeben lässt, endet als <see cref="Diffausgang.NameNichtLesbar"/>; ein Patch, der der Zählung der Dateiliste
/// widerspricht oder den Kopf einer zweiten Datei trägt, als <see cref="Diffausgang.NichtLesbar"/> — nie als leerer oder fremder Patch.
/// </summary>
internal sealed class DiffLesenInteractor(Commitzeilen commits, GemerkteDateiquelle dateien, IDiffquelle diffquelle, StderrProtokoll protokoll)
{
    private const string Anfragekontext = "Anfrage";
    private const string Fehlerkontext = "Diff";

    private readonly Dictionary<string, string> hashNachSchreibweise = HashesDerAuswahl(commits);

    public Differgebnis Lesen(Diffanfrage anfrage)
    {
        var istHashDerAuswahl = hashNachSchreibweise.TryGetValue(anfrage.Hash, out var hash);
        if (!istHashDerAuswahl || hash is null)
        {
            return Differgebnis.NichtGefunden;
        }
        return LeseDateiDesCommits(hash, anfrage);
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

    private Differgebnis LeseDateiDesCommits(string hash, Diffanfrage anfrage)
    {
        Dateiaenderungen dateienDesCommits;
        try
        {
            dateienDesCommits = dateien.GemerktOderGelesen(hash);
        }
        catch (GitFehler fehler)
        {
            protokoll.Melde(Protokollstufe.Fehler, Fehlerkontext, $"Dateiliste von Commit {hash} für den Diff nicht lesbar: {fehler.Message}");
            return Differgebnis.NichtLesbar;
        }
        var treffer = Namenspruefung.Pruefe(dateienDesCommits, anfrage.Pfad);
        var datei = treffer.Datei;
        if (datei is null)
        {
            return Abgewiesen(hash, anfrage, treffer.Fall);
        }
        protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"GET /api/commits/{hash}/diff Datei {datei.Pfad}{WahlText(anfrage)}");
        DiffAntwort antwort;
        try
        {
            antwort = AntwortFuer(hash, anfrage, datei);
        }
        catch (GitZuGross zuGross)
        {
            protokoll.Melde(Protokollstufe.Warnung, Fehlerkontext, $"Diff von Commit {hash}, Datei {datei.Pfad} zu groß: Ausgabegrenze von {zuGross.Grenze} Byte überschritten");
            return Differgebnis.ZuGross(zuGross.Grenze);
        }
        catch (GitFehler fehler)
        {
            protokoll.Melde(Protokollstufe.Fehler, Fehlerkontext, $"Diff von Commit {hash}, Datei {datei.Pfad} nicht lesbar: {fehler.Message}");
            return Differgebnis.NichtLesbar;
        }
        return GelesenWennDerPatchZurDateiPasst(hash, datei, anfrage, antwort);
    }

    private Differgebnis GelesenWennDerPatchZurDateiPasst(string hash, Dateiaenderung datei, Diffanfrage anfrage, DiffAntwort antwort)
    {
        var zeigtMehrAlsDieseDatei = !Patcheinheit.ZeigtEineDatei(antwort.Patch);
        if (zeigtMehrAlsDieseDatei)
        {
            protokoll.Melde(Protokollstufe.Fehler, Fehlerkontext, $"Diff von Commit {hash}, Datei {datei.Pfad} nicht lesbar: der Patch trägt den Kopf einer zweiten Datei");
            return Differgebnis.NichtLesbar;
        }
        var widersprichtDerZaehlung = ZaehlungPruefen(anfrage) && antwort.Art == Diffaufbereitung.ArtText && !Patchzaehlung.PasstZurDateiliste(antwort.Patch, datei);
        if (widersprichtDerZaehlung)
        {
            protokoll.Melde(Protokollstufe.Fehler, Fehlerkontext,
                $"Diff von Commit {hash}, Datei {datei.Pfad} nicht lesbar: der Patch trägt nicht die gezählten +{datei.Plus} −{datei.Minus} Zeilen");
            return Differgebnis.NichtLesbar;
        }
        return Differgebnis.Gelesen(antwort);
    }

    /// <summary>
    /// Die Zeilenzahl der Dateiliste stammt aus dem Vergleich ohne `-w`; mit „Leerraum ignorieren“ verschwinden reine
    /// Leerraum-Änderungen und der Patch trägt andere Zahlen (R00026), die Prüfung kann dort nicht greifen. Der Schutz
    /// gegen den Kopf einer zweiten Datei (<see cref="Patcheinheit"/>) gilt in beiden Stellungen.
    /// </summary>
    private static bool ZaehlungPruefen(Diffanfrage anfrage)
    {
        return anfrage.Leerraum == Leerraum.Beachten;
    }

    /// <summary>Die Debug-Zeile nennt nur die Länge des Namens: er kommt aus der Anfrage und ist hier keiner Datei zugeordnet.</summary>
    private Differgebnis Abgewiesen(string hash, Diffanfrage anfrage, Namensfall fall)
    {
        switch (fall)
        {
            case Namensfall.NichtGefunden:
                protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"Diff von Commit {hash} abgewiesen: Pfad steht nicht in der Dateiliste (Länge {anfrage.Pfad.Length})");
                return Differgebnis.NichtGefunden;
            case Namensfall.NichtEindeutig:
                protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"Diff von Commit {hash} abgewiesen: mehrere Dateien tragen den Namen (Länge {anfrage.Pfad.Length})");
                return Differgebnis.NameNichtLesbar;
            case Namensfall.NichtUebergebbar:
                protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"Diff von Commit {hash} abgewiesen: Name mit ungültigem Byte und Zeilenende lässt sich nicht an git übergeben (Länge {anfrage.Pfad.Length})");
                return Differgebnis.NameNichtLesbar;
            default:
                throw new InvalidOperationException($"Unbekannter Namensfall {fall}");
        }
    }

    /// <summary>Die Debug-Zeile nennt die Wahl des Menschen: „als Text“ bei einer Binärdatei, die Ansicht und die Leerraum-Stellung.</summary>
    private static string WahlText(Diffanfrage anfrage)
    {
        var wahl = "";
        if (anfrage.AlsText)
        {
            wahl += " als Text";
        }
        if (anfrage.Umfang == Diffumfang.Ganz)
        {
            wahl += " ganze Datei";
        }
        if (anfrage.Leerraum == Leerraum.Ignorieren)
        {
            wahl += " Leerraum ignorieren";
        }
        return wahl;
    }

    /// <summary>Eine Binärdatei kommt mit Grund und ohne Byte-Inhalt — ihren Text liest erst die ausdrückliche Wahl (Entscheidung des PO).</summary>
    private DiffAntwort AntwortFuer(string hash, Diffanfrage anfrage, Dateiaenderung datei)
    {
        var art = Diffaufbereitung.ArtVon(datei);
        var patch = "";
        string? grund = null;
        if (art == Diffaufbereitung.ArtText)
        {
            patch = diffquelle.Lesen(hash, datei, anfrage.Umfang, anfrage.Leerraum);
        }
        if (art == Diffaufbereitung.ArtBinaer)
        {
            grund = diffquelle.BinaerGrund(hash, datei);
        }
        var binaerAlsTextGewaehlt = art == Diffaufbereitung.ArtBinaer && anfrage.AlsText;
        if (binaerAlsTextGewaehlt)
        {
            patch = diffquelle.AlsTextLesen(hash, datei, anfrage.Umfang, anfrage.Leerraum);
        }
        return new DiffAntwort(datei.Pfad, datei.Status, datei.AlterPfad, art, grund, patch);
    }
}
