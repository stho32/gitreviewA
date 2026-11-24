using System.Text.RegularExpressions;

namespace GitReviewA.Aufruf;

/// <summary>
/// Ein Bereich ist fremde Eingabe an git: nur Endpunkte aus einer engen Zeichenklasse kommen durch,
/// damit weder Optionen noch Spezialsyntax (`@{`, `^{`, `:/`, `:`) entstehen können.
/// </summary>
internal static partial class Bereichspruefer
{
    public const string Bereichstrenner = "..";
    private const string SymmetrischeDifferenz = "...";

    public static bool IstZulaessigerBereich(string argument)
    {
        var istSymmetrischeDifferenz = argument.Contains(SymmetrischeDifferenz, StringComparison.Ordinal);
        if (istSymmetrischeDifferenz)
        {
            return false;
        }
        var endpunkte = argument.Split(Bereichstrenner);
        var hatGenauEinenTrenner = endpunkte.Length == 2;
        if (!hatGenauEinenTrenner)
        {
            return false;
        }
        return SindZulaessigeEndpunkte(endpunkte[0], endpunkte[1]);
    }

    private static bool SindZulaessigeEndpunkte(string von, string bis)
    {
        var beideFehlen = von.Length == 0 && bis.Length == 0;
        if (beideFehlen)
        {
            return false;
        }
        return IstFehlenderOderZulaessigerEndpunkt(von) && IstFehlenderOderZulaessigerEndpunkt(bis);
    }

    private static bool IstFehlenderOderZulaessigerEndpunkt(string endpunkt)
    {
        var fehlt = endpunkt.Length == 0;
        if (fehlt)
        {
            return true;
        }
        return EndpunktMuster().IsMatch(endpunkt);
    }

    [GeneratedRegex(@"^(?!-)[A-Za-z0-9._/-]+(?:[~^][0-9]{0,6})*\z", RegexOptions.CultureInvariant)]
    private static partial Regex EndpunktMuster();
}
