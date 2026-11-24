using System.Buffers;
using System.Globalization;
using System.Text;

namespace GitReviewA.Fremdtext;

/// <summary>
/// Namen aus dem fremden Repo („Trojan Source“) für Protokoll und Ergebnis: jedes Zeichen, das man nicht sieht oder das die Anzeige verdreht,
/// steht als Marke `⟨U+202E⟩` — Steuerzeichen außer Tab, alle Formatzeichen (Richtung, Nullbreiten, BOM, Tags), Zeilen- und Absatztrenner
/// und einzelne Surrogate. Das ist eine Obermenge der Marken über dem Diff in der Oberfläche.
/// </summary>
internal static class UnsichtbareZeichen
{
    public static string AlsMarken(string text)
    {
        var ergebnis = new StringBuilder(text.Length);
        var rest = text.AsSpan();
        while (!rest.IsEmpty)
        {
            var status = Rune.DecodeFromUtf16(rest, out var zeichen, out var laenge);
            var istEinzelnesSurrogat = status != OperationStatus.Done;
            if (istEinzelnesSurrogat)
            {
                HaengeMarkeAn(ergebnis, rest[0]);
            }
            else if (IstUnsichtbar(zeichen))
            {
                HaengeMarkeAn(ergebnis, zeichen.Value);
            }
            else
            {
                ergebnis.Append(rest[..laenge]);
            }
            rest = rest[laenge..];
        }
        return ergebnis.ToString();
    }

    private static void HaengeMarkeAn(StringBuilder ergebnis, int codepunkt)
    {
        ergebnis.Append(CultureInfo.InvariantCulture, $"⟨U+{codepunkt:X4}⟩");
    }

    private static bool IstUnsichtbar(Rune zeichen)
    {
        var kategorie = Rune.GetUnicodeCategory(zeichen);
        var istSteuerzeichen = kategorie == UnicodeCategory.Control && zeichen.Value != '\t';
        var istFormatzeichen = kategorie == UnicodeCategory.Format;
        var istZeilenOderAbsatztrenner = kategorie is UnicodeCategory.LineSeparator or UnicodeCategory.ParagraphSeparator;
        return istSteuerzeichen || istFormatzeichen || istZeilenOderAbsatztrenner;
    }
}
