using System.Globalization;
using System.Text;

namespace GitReviewA.Protokoll;

internal static class Protokollzeile
{
    private const string Zeitformat = "yyyy-MM-ddTHH:mm:ss.fffzzz";
    private const string Zeilenersatz = " / ";

    public static string Formatiere(DateTimeOffset zeit, Protokollstufe stufe, string kontext, string meldung)
    {
        var zeitText = zeit.ToString(Zeitformat, CultureInfo.InvariantCulture);
        var einzeiligeMeldung = Einzeilig(meldung);
        return $"{zeitText} {Stufenwort(stufe)} [{kontext}] {MitMarken(einzeiligeMeldung)}";
    }

    private static string Einzeilig(string meldung)
    {
        return meldung.Replace("\r\n", Zeilenersatz).Replace("\n", Zeilenersatz).Replace("\r", Zeilenersatz);
    }

    /// <summary>Namen aus dem fremden Repo stehen im Protokoll: Terminal-Steuerfolgen (ESC, CSI, BEL) und Richtungszeichen als Marke `⟨U+001B⟩`.</summary>
    private static string MitMarken(string meldung)
    {
        var ergebnis = new StringBuilder(meldung.Length);
        foreach (var zeichen in meldung)
        {
            if (IstUnsichtbaresSteuerzeichen(zeichen))
            {
                ergebnis.Append(CultureInfo.InvariantCulture, $"⟨U+{(int)zeichen:X4}⟩");
                continue;
            }
            ergebnis.Append(zeichen);
        }
        return ergebnis.ToString();
    }

    private static bool IstUnsichtbaresSteuerzeichen(char zeichen)
    {
        var istSteuerzeichen = char.IsControl(zeichen) && zeichen != '\t';
        var istRichtungszeichen = zeichen is '\u061C' or '\u200E' or '\u200F' or (>= '\u202A' and <= '\u202E') or (>= '\u2066' and <= '\u2069');
        return istSteuerzeichen || istRichtungszeichen;
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
