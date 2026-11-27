using System.Buffers;
using System.Globalization;
using System.Text;

namespace GitReviewA.Fremdtext;

/// <summary>
/// Namen aus dem fremden Repo („Trojan Source“) für Protokoll und Ergebnis: jedes Zeichen, das man nicht sieht oder das die Anzeige verdreht,
/// steht als Marke `⟨U+202E⟩` — Steuerzeichen außer Tab, alle Formatzeichen (Richtung, Nullbreiten, BOM, Tags), Zeilen- und Absatztrenner,
/// die standardmäßig unsichtbaren Zeichen außerhalb der Formatzeichen (Variationsselektoren, Hangul-Füller, reservierte Tag-Bereiche) und
/// einzelne Surrogate. Das ist eine Obermenge der Marken über dem Diff in der Oberfläche.
/// </summary>
internal static class UnsichtbareZeichen
{
    /// <summary>
    /// Die standardmäßig unsichtbaren Codepunkte (Unicode-Eigenschaft `Default_Ignorable_Code_Point`) außer den schon als Formatzeichen
    /// gezählten, dazu U+2800 (leeres Braille-Muster, Entscheidung des product-owner 2026-11-27). Herkunft: Unicode
    /// `DerivedCoreProperties.txt`, Version 15.1; .NET kennt die Eigenschaft nicht als API, deshalb steht sie als Tabelle hier.
    /// </summary>
    private static readonly (int Anfang, int Ende)[] WeitereUnsichtbareBereiche =
    [
        (0x034F, 0x034F),
        (0x115F, 0x1160),
        (0x17B4, 0x17B5),
        (0x180B, 0x180D),
        (0x180F, 0x180F),
        (0x2065, 0x2065),
        (0x2800, 0x2800),
        (0x3164, 0x3164),
        (0xFE00, 0xFE0F),
        (0xFFA0, 0xFFA0),
        (0xFFF0, 0xFFF8),
        (0xE0000, 0xE0000),
        (0xE0002, 0xE001F),
        (0xE0080, 0xE0FFF),
    ];

    /// <summary>Ob der Text ein Zeichen trägt, das man nicht sieht oder das die Anzeige verdreht (dieselbe Klasse wie <see cref="AlsMarken"/>).</summary>
    public static bool EnthaeltUnsichtbares(string text)
    {
        var rest = text.AsSpan();
        while (!rest.IsEmpty)
        {
            var status = Rune.DecodeFromUtf16(rest, out var zeichen, out var laenge);
            var istEinzelnesSurrogat = status != OperationStatus.Done;
            if (istEinzelnesSurrogat || IstUnsichtbar(zeichen))
            {
                return true;
            }
            rest = rest[laenge..];
        }
        return false;
    }

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
        var istStandardmaessigUnsichtbar = LiegtInWeiteremBereich(zeichen.Value);
        return istSteuerzeichen || istFormatzeichen || istZeilenOderAbsatztrenner || istStandardmaessigUnsichtbar;
    }

    private static bool LiegtInWeiteremBereich(int codepunkt)
    {
        foreach (var (anfang, ende) in WeitereUnsichtbareBereiche)
        {
            var liegtImBereich = codepunkt >= anfang && codepunkt <= ende;
            if (liegtImBereich)
            {
                return true;
            }
        }
        return false;
    }
}
