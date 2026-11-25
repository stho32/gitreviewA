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

    /// <summary>Ein Codepunkt wird in UTF-8 höchstens vier Bytes lang.</summary>
    private const int HoechstzahlBytesJeCodepunkt = 4;

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
        foreach (var zeichen in teil.EnumerateRunes())
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

    private static bool IstUnkodiert(Rune zeichen)
    {
        var istAsciiZeichen = zeichen.IsAscii;
        if (!istAsciiZeichen)
        {
            return false;
        }
        var alsZeichen = (char)zeichen.Value;
        var istBuchstabeOderZiffer = char.IsAsciiLetterOrDigit(alsZeichen);
        if (istBuchstabeOderZiffer)
        {
            return true;
        }
        return UnkodiertBleibend.Contains(alsZeichen, StringComparison.Ordinal);
    }

    /// <summary>
    /// Ein Zeichen außerhalb der Grundebene besteht aus zwei UTF-16-Codeeinheiten; kodiert wird deshalb je Codepunkt — sonst ergäben
    /// die beiden Codeeinheiten je ein Ersatzzeichen (`%EF%BF%BD`) statt der vier Bytes des UTF-8, und ein Name mit einem solchen
    /// Zeichen trüge dasselbe Ziel wie der sichtbar andere Name aus zwei Ersatzzeichen.
    /// </summary>
    private static void HaengeKodierteBytesAn(StringBuilder ergebnis, Rune zeichen)
    {
        Span<byte> bytes = stackalloc byte[HoechstzahlBytesJeCodepunkt];
        var anzahl = zeichen.EncodeToUtf8(bytes);
        for (var stelle = 0; stelle < anzahl; stelle += 1)
        {
            ergebnis.Append('%').Append(bytes[stelle].ToString("X2", CultureInfo.InvariantCulture));
        }
    }
}
