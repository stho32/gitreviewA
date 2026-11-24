using System.Globalization;
using System.Text;

namespace GitReviewA.Fremdtext;

/// <summary>Namen aus dem fremden Repo („Trojan Source“): Terminal-Steuerfolgen (ESC, CSI, BEL) und Richtungszeichen stehen als Marke `⟨U+001B⟩`.</summary>
internal static class UnsichtbareZeichen
{
    public static string AlsMarken(string text)
    {
        var ergebnis = new StringBuilder(text.Length);
        foreach (var zeichen in text)
        {
            if (IstUnsichtbar(zeichen))
            {
                ergebnis.Append(CultureInfo.InvariantCulture, $"⟨U+{(int)zeichen:X4}⟩");
                continue;
            }
            ergebnis.Append(zeichen);
        }
        return ergebnis.ToString();
    }

    private static bool IstUnsichtbar(char zeichen)
    {
        var istSteuerzeichen = char.IsControl(zeichen) && zeichen != '\t';
        var istRichtungszeichen = zeichen is '؜' or '‎' or '‏' or (>= '‪' and <= '‮') or (>= '⁦' and <= '⁩');
        return istSteuerzeichen || istRichtungszeichen;
    }
}
