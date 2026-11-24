using System.Diagnostics.CodeAnalysis;
using System.Text;

namespace GitReviewA.Anmerkungen;

/// <summary>
/// Regel für den Text jeder Anmerkungsart (Entscheidung des PO): nicht leer, höchstens 10 000 Zeichen, ohne Steuer- und Richtungszeichen —
/// der Text landet unverändert auf stdout, wo ein Terminal Steuerfolgen ausführt und Richtungszeichen die Zeile verdrehen.
/// Tab, Zeilenumbruch (LF, CR) und Zeichen wie der Nullbreiten-Verbinder in Emoji bleiben erlaubt.
/// </summary>
internal static class Anmerkungstext
{
    private const int HoechsteTextlaengeInZeichen = 10_000;

    private static readonly (int Von, int Bis)[] AbgelehnteBereiche =
    [
        (0x0000, 0x0008),
        (0x000B, 0x000C),
        (0x000E, 0x001F),
        (0x007F, 0x009F),
        (0x061C, 0x061C),
        (0x200E, 0x200F),
        (0x202A, 0x202E),
        (0x2066, 0x2069),
    ];

    public static bool IstGueltig([NotNullWhen(true)] string? text, out string grund)
    {
        grund = string.Empty;
        if (string.IsNullOrWhiteSpace(text))
        {
            grund = "Text fehlt";
            return false;
        }
        var textIstZuLang = text.EnumerateRunes().Count() > HoechsteTextlaengeInZeichen;
        if (textIstZuLang)
        {
            grund = $"Text ist länger als {HoechsteTextlaengeInZeichen} Zeichen";
            return false;
        }
        var enthaeltSteuerOderRichtungszeichen = text.EnumerateRunes().Any(IstAbgelehntesZeichen);
        if (enthaeltSteuerOderRichtungszeichen)
        {
            grund = "Text enthält Steuer- oder Richtungszeichen";
            return false;
        }
        return true;
    }

    private static bool IstAbgelehntesZeichen(Rune zeichen)
    {
        return AbgelehnteBereiche.Any(bereich => zeichen.Value >= bereich.Von && zeichen.Value <= bereich.Bis);
    }
}
