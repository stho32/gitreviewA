using GitReviewA.Aufruf;
using GitReviewA.Git;

namespace GitReviewA.Dateiansicht;

/// <summary>Eine Angabe, die nicht zeigbar ist: der Wortlaut der Angabe und ihr Grund (der ganze Start wird abgelehnt).</summary>
internal sealed record Quellenfehler(string Angabe, Quellengrund Grund);

/// <summary>Der Ausgang des Startinteractors: ein Stand im RAM oder alle Gründe; nie eine halbe Ansicht (PO 2026-11-25, Zeile 203).</summary>
internal sealed record Startausgang(Dateiansichtsstand? Stand, IReadOnlyList<Quellenfehler> Fehler, string? Grenzenmeldung = null)
{
    public bool IstErfolg => Stand is not null;

    public static Startausgang Zeigbar(Dateiansichtsstand stand)
    {
        return new Startausgang(stand, []);
    }

    public static Startausgang Abgelehnt(IReadOnlyList<Quellenfehler> fehler)
    {
        return new Startausgang(null, fehler);
    }

    /// <summary>Der ganze Start abgelehnt mit einer Meldung für die Liste — ohne eine Datei zu prüfen (mehr als 50 Angaben).</summary>
    public static Startausgang Grenzen(string meldung)
    {
        return new Startausgang(null, [], meldung);
    }
}

/// <summary>
/// Der Start der Dateiansicht (R00043, B4204): jede Angabe lesen und einordnen, bei einem Grund keine Ansicht; sonst der Stand
/// mit allen Bytes im RAM. Lesen und Einordnen stehen hier einmal, damit Anzeige, Größe, Zeilenzahl und Kopie dieselben Bytes sind.
/// </summary>
internal sealed class DateiansichtStartInteractor
{
    private readonly IDateiLeser leser;
    private readonly ICommitDateiquelle commitquelle;
    private readonly Ausgabegrenze grenze;

    public DateiansichtStartInteractor(IDateiLeser leser, ICommitDateiquelle commitquelle, Ausgabegrenze? grenze = null)
    {
        this.leser = leser;
        this.commitquelle = commitquelle;
        this.grenze = grenze ?? Ausgabegrenze.Standard;
    }

    public Startausgang Starte(Dateiaufruf aufruf)
    {
        if (Quellengrenzen.Zahlmeldung(aufruf.Quellen.Count) is string zuviele)
        {
            return Startausgang.Grenzen(zuviele);
        }
        var fehler = new List<Quellenfehler>();
        var eintraege = new List<Dateieintrag>();
        var gesehen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var angabe in aufruf.Quellen)
        {
            if (!gesehen.Add(angabe))
            {
                continue;
            }
            var eintrag = LiesUndOrdne(angabe, eintraege.Count, fehler);
            if (eintrag is not null)
            {
                eintraege.Add(eintrag);
                continue;
            }
            if (fehler.Count > 0 && fehler[^1].Grund.Art == Quellengrundart.ZusammenZuGross)
            {
                // Die Summe ist überschritten: das Lesen bricht hier ab, die weiteren Angaben werden nicht gelesen
                // (R00045 Kriterien 3 und 7, Angriffsmatrix G4). Die Gründe bis hierher bleiben stehen.
                break;
            }
        }
        if (fehler.Count > 0)
        {
            return Startausgang.Abgelehnt(fehler);
        }
        return Startausgang.Zeigbar(new Dateiansichtsstand(eintraege));
    }

    /// <summary>Jede Ausnahme beim Lesen einer Angabe wird zu Exit 2 mit Grund, nie zu Exit 1 oder 134 (L14).</summary>
    private Dateieintrag? LiesUndOrdne(string angabe, int nummer, List<Quellenfehler> fehler)
    {
        var erkannt = Quellenart.Erkenne(angabe);
        if (!erkannt.IstErkannt)
        {
            fehler.Add(new Quellenfehler(angabe, erkannt.Grund ?? Quellengrund.DateiNichtLesbar));
            return null;
        }
        try
        {
            return erkannt.Quelle switch
            {
                Datentraegerquelle datentraeger => LiesDatentraeger(angabe, nummer, datentraeger.Pfad, fehler),
                Commitquelle commit => LiesCommit(angabe, nummer, commit, fehler),
                _ => throw new InvalidOperationException("unbekannte Quelle"),
            };
        }
        catch (GitZuGross)
        {
            fehler.Add(new Quellenfehler(angabe, Quellengrund.ZuGross));
            return null;
        }
        catch (Exception)
        {
            fehler.Add(new Quellenfehler(angabe, Quellengrund.DateiNichtLesbar));
            return null;
        }
    }

    private Dateieintrag? LiesDatentraeger(string angabe, int nummer, string pfad, List<Quellenfehler> fehler)
    {
        var lesung = leser.Lies(pfad, grenze);
        if (!lesung.IstGelesen)
        {
            fehler.Add(new Quellenfehler(angabe, lesung.Grund ?? Quellengrund.DateiNichtLesbar));
            return null;
        }
        var dateilesung = lesung.Lesung ?? throw new InvalidOperationException("gelesen ohne Lesung");
        var einordnung = Inhaltseinordnung.Ordne(dateilesung.Bytes);
        if (!einordnung.IstEingeordnet)
        {
            fehler.Add(new Quellenfehler(angabe, einordnung.Grund ?? Quellengrund.DateiNichtLesbar));
            return null;
        }
        return Dateieintrag.Aus(nummer, dateilesung, einordnung.Text ?? throw new InvalidOperationException("eingeordnet ohne Text"));
    }

    /// <summary>Auflösen, Eintrag lesen, Blob lesen und einordnen — der Weg einer Commitquelle (B4262/B4263).</summary>
    private Dateieintrag? LiesCommit(string angabe, int nummer, Commitquelle quelle, List<Quellenfehler> fehler)
    {
        var aufloesung = commitquelle.Aufloese(quelle.Hash);
        if (!aufloesung.IstAufgeloest)
        {
            fehler.Add(new Quellenfehler(angabe, aufloesung.Grund ?? Quellengrund.CommitNichtGefunden));
            return null;
        }
        var vollerHash = aufloesung.VollerHash ?? throw new InvalidOperationException("aufgelöst ohne Hash");
        var eintragsergebnis = commitquelle.Eintrag(vollerHash, quelle.Pfad, grenze);
        if (!eintragsergebnis.IstGefunden)
        {
            fehler.Add(new Quellenfehler(angabe, eintragsergebnis.Grund ?? Quellengrund.PfadImCommitNichtGefunden));
            return null;
        }
        var eintrag = eintragsergebnis.Eintrag ?? throw new InvalidOperationException("gefunden ohne Eintrag");
        if (eintrag.Groesse > grenze.Bytes)
        {
            fehler.Add(new Quellenfehler(angabe, Quellengrund.ZuGross));
            return null;
        }
        var blob = commitquelle.Blob(vollerHash, eintrag.Pfad, grenze);
        if (!blob.IstGelesen)
        {
            fehler.Add(new Quellenfehler(angabe, blob.Grund ?? Quellengrund.DateiNichtLesbar));
            return null;
        }
        var bytes = blob.Bytes ?? throw new InvalidOperationException("gelesen ohne Bytes");
        var einordnung = Inhaltseinordnung.Ordne(bytes);
        if (!einordnung.IstEingeordnet)
        {
            fehler.Add(new Quellenfehler(angabe, einordnung.Grund ?? Quellengrund.DateiNichtLesbar));
            return null;
        }
        return Dateieintrag.AusCommit(nummer, vollerHash, eintrag.Pfad, einordnung.Text!);
    }
}