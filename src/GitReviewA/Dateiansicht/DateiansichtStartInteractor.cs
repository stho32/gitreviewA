using GitReviewA.Aufruf;
using GitReviewA.Git;

namespace GitReviewA.Dateiansicht;

/// <summary>Eine Angabe, die nicht zeigbar ist: der Wortlaut der Angabe und ihr Grund (der ganze Start wird abgelehnt).</summary>
internal sealed record Quellenfehler(string Angabe, Quellengrund Grund);

/// <summary>Der Ausgang des Startinteractors: ein Stand im RAM oder alle Gründe; nie eine halbe Ansicht (PO 2026-11-25, Zeile 203).</summary>
internal sealed record Startausgang(Dateiansichtsstand? Stand, IReadOnlyList<Quellenfehler> Fehler)
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
}

/// <summary>
/// Der Start der Dateiansicht (R00043, B4204): jede Angabe lesen und einordnen, bei einem Grund keine Ansicht; sonst der Stand
/// mit allen Bytes im RAM. Lesen und Einordnen stehen hier einmal, damit Anzeige, Größe, Zeilenzahl und Kopie dieselben Bytes sind.
/// </summary>
internal sealed class DateiansichtStartInteractor
{
    private readonly IDateiLeser leser;
    private readonly Ausgabegrenze grenze;

    public DateiansichtStartInteractor(IDateiLeser leser, Ausgabegrenze? grenze = null)
    {
        this.leser = leser;
        this.grenze = grenze ?? Ausgabegrenze.Standard;
    }

    public Startausgang Starte(Dateiaufruf aufruf)
    {
        var fehler = new List<Quellenfehler>();
        var eintraege = new List<Dateieintrag>();
        foreach (var angabe in aufruf.Quellen)
        {
            var eintrag = LiesUndOrdne(angabe, eintraege.Count, fehler);
            if (eintrag is not null)
            {
                eintraege.Add(eintrag);
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
        try
        {
            var lesung = leser.Lies(angabe, grenze);
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
            var text = einordnung.Text ?? throw new InvalidOperationException("eingeordnet ohne Text");
            return Dateieintrag.Aus(nummer, dateilesung, text);
        }
        catch (Exception)
        {
            fehler.Add(new Quellenfehler(angabe, Quellengrund.DateiNichtLesbar));
            return null;
        }
    }
}