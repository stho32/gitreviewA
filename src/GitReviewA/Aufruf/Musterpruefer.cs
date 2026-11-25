using GitReviewA.Fremdtext;

namespace GitReviewA.Aufruf;

/// <summary>Prüft ein Ausblendmuster nach R00025: 1 bis 200 Zeichen ohne Steuer- und Richtungszeichen, höchstens 20 Muster je Lauf. Reine Operation.</summary>
internal static class Musterpruefer
{
    public const int HoechsteLaenge = 200;
    public const int Hoechstzahl = 20;

    public static MusterpruefungsErgebnis Pruefe(string text, int anzahlBisher)
    {
        var istZahlErschoepft = anzahlBisher >= Hoechstzahl;
        if (istZahlErschoepft)
        {
            return MusterpruefungsErgebnis.Abgelehnt(Musterablehnungsgrund.ZuViele);
        }
        var traegtUnsichtbares = UnsichtbareZeichen.EnthaeltUnsichtbares(text);
        if (traegtUnsichtbares)
        {
            return MusterpruefungsErgebnis.Abgelehnt(Musterablehnungsgrund.Steuerzeichen);
        }
        var istZuLang = text.Length > HoechsteLaenge;
        if (istZuLang)
        {
            return MusterpruefungsErgebnis.Abgelehnt(Musterablehnungsgrund.ZuLang);
        }
        var istLeerOderNurLeerraum = string.IsNullOrWhiteSpace(text);
        if (istLeerOderNurLeerraum)
        {
            return MusterpruefungsErgebnis.Abgelehnt(Musterablehnungsgrund.Leer);
        }
        return MusterpruefungsErgebnis.Gueltig();
    }

    public static string Meldung(Musterablehnungsgrund grund)
    {
        return grund switch
        {
            Musterablehnungsgrund.Leer => "Ein --ignore-Muster darf nicht leer sein.",
            Musterablehnungsgrund.ZuLang => $"Ein --ignore-Muster darf höchstens {HoechsteLaenge} Zeichen haben.",
            Musterablehnungsgrund.Steuerzeichen => "Ein --ignore-Muster darf keine Steuer- oder Richtungszeichen enthalten.",
            Musterablehnungsgrund.ZuViele => $"Höchstens {Hoechstzahl} --ignore-Muster sind erlaubt.",
            _ => throw new ArgumentOutOfRangeException(nameof(grund), grund, "Unbekannter Ablehnungsgrund."),
        };
    }
}
