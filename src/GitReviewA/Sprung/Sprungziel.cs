using System.Globalization;
using System.Text;

namespace GitReviewA.Sprung;

/// <summary>
/// Das Sprungziel als Zeichenkette aus festem Schema und prozent-kodiertem Pfad. Der Server liefert es ohne Zeile, der Browser hängt
/// nur `:<Zeile>` an. Je Pfadteil `encodeURIComponent`, die Trenner `/` bleiben unkodiert (Vorlage kanbanD `teileKodiert`); ein
/// anderes Schema als <see cref="Schema"/> gibt es nicht, ein `javascript:`-Ziel ist damit ausgeschlossen.
/// </summary>
internal static class Sprungziel
{
    public const string Schema = "vscode://file";

    private const char Trenner = '/';

    /// <summary>Die Zeichen, die `encodeURIComponent` unkodiert lässt.</summary>
    private const string UnkodiertBleibend = "-_.!~*'()";

    public static string Fuer(string absoluterPfad)
    {
        return Schema + Kodiert(absoluterPfad);
    }

    private static string Kodiert(string pfad)
    {
        var teile = pfad.Split(Trenner);
        for (var stelle = 0; stelle < teile.Length; stelle++)
        {
            teile[stelle] = TeilKodiert(teile[stelle]);
        }
        return string.Join(Trenner, teile);
    }

    private static string TeilKodiert(string teil)
    {
        var ergebnis = new StringBuilder(teil.Length);
        foreach (var zeichen in teil)
        {
            var bleibtUnkodiert = IstUnkodiert(zeichen);
            if (bleibtUnkodiert)
            {
                ergebnis.Append(zeichen);
                continue;
            }
            HaengeKodierteBytesAn(ergebnis, zeichen);
        }
        return ergebnis.ToString();
    }

    private static bool IstUnkodiert(char zeichen)
    {
        var istBuchstabeOderZiffer = char.IsAsciiLetterOrDigit(zeichen);
        return istBuchstabeOderZiffer || UnkodiertBleibend.Contains(zeichen, StringComparison.Ordinal);
    }

    private static void HaengeKodierteBytesAn(StringBuilder ergebnis, char zeichen)
    {
        foreach (var bytewert in Encoding.UTF8.GetBytes([zeichen]))
        {
            ergebnis.Append('%').Append(bytewert.ToString("X2", CultureInfo.InvariantCulture));
        }
    }
}
