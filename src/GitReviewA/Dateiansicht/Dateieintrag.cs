using GitReviewA.Fremdtext;

namespace GitReviewA.Dateiansicht;

/// <summary>
/// Eine Datei der Dateiansicht, wie sie der Browser nennt: nur die Nummer, nie ein Pfad. Anzeigename und echter Pfad tragen
/// Marken für unsichtbare Zeichen (Lehre #17); der Text bleibt roh — kopiert wird die Datei, nicht die Anzeige.
/// </summary>
internal sealed record Dateieintrag(int Nummer, string Angabe, string Anzeigename, string EchterPfad, Dateitext Text)
{
    /// <summary>So viele UTF-16-Einheiten zeigt eine Zeile höchstens; der Rest wird kopiert, aber nicht gezeigt.</summary>
    public const int HoechstZeichenJeZeile = 10_000;

    /// <summary>Die Zeilen, von denen nur ein Anfang gezeigt wird; die Bestätigung und der Kopf nennen ihre Zahl (L5/E3).</summary>
    public int GekuerzteZeilen => AnzahlGekuerzterZeilen(Text.Text);

    public static Dateieintrag Aus(int nummer, Dateilesung lesung, Dateitext text)
    {
        return new Dateieintrag(
            nummer,
            lesung.Angabe,
            UnsichtbareZeichen.AlsMarken(lesung.Angabe),
            UnsichtbareZeichen.AlsMarken(lesung.EchterPfad),
            text);
    }

    private static int AnzahlGekuerzterZeilen(string text)
    {
        if (text.Length == 0)
        {
            return 0;
        }
        return text.Split('\n').Count(IstGekuerzt);
    }

    private static bool IstGekuerzt(string zeile)
    {
        var laenge = zeile.EndsWith('\r') ? zeile.Length - 1 : zeile.Length;
        return laenge > HoechstZeichenJeZeile;
    }
}

/// <summary>Der Stand beim Start: alle geprüften Dateien im RAM, nichts wird nachgeladen (R00043, „Stand beim Start“).</summary>
internal sealed class Dateiansichtsstand
{
    private readonly Dateieintrag[] eintraege;

    public Dateiansichtsstand(IEnumerable<Dateieintrag> eintraege)
    {
        this.eintraege = eintraege.ToArray();
    }

    public int Anzahl => eintraege.Length;

    public Dateieintrag this[int nummer] => eintraege[nummer];

    /// <summary>Nur die Nummer aus der Liste führt zum Inhalt; außerhalb der Liste ist <c>null</c>.</summary>
    public Dateieintrag? Datei(int nummer)
    {
        return nummer >= 0 && nummer < eintraege.Length ? eintraege[nummer] : null;
    }
}