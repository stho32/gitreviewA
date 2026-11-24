using System.Globalization;
using GitReviewA.Fremdtext;

namespace GitReviewA.Protokoll;

internal static class Protokollzeile
{
    private const string Zeitformat = "yyyy-MM-ddTHH:mm:ss.fffzzz";
    private const string Zeilenersatz = " / ";

    public static string Formatiere(DateTimeOffset zeit, Protokollstufe stufe, string kontext, string meldung)
    {
        var zeitText = zeit.ToString(Zeitformat, CultureInfo.InvariantCulture);
        var einzeiligeMeldung = Einzeilig(meldung);
        return $"{zeitText} {Stufenwort(stufe)} [{kontext}] {UnsichtbareZeichen.AlsMarken(einzeiligeMeldung)}";
    }

    private static string Einzeilig(string meldung)
    {
        return meldung.Replace("\r\n", Zeilenersatz).Replace("\n", Zeilenersatz).Replace("\r", Zeilenersatz);
    }

    private static string Stufenwort(Protokollstufe stufe)
    {
        return stufe switch
        {
            Protokollstufe.Debug => "DEBUG",
            Protokollstufe.Information => "INFO",
            Protokollstufe.Warnung => "WARNUNG",
            Protokollstufe.Fehler => "FEHLER",
            _ => throw new ArgumentOutOfRangeException(nameof(stufe), stufe, "unbekannte Protokollstufe"),
        };
    }
}
