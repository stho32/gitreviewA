using GitReviewA.Git;

namespace GitReviewA.Diff;

/// <summary>
/// Netz gegen einen leeren oder fremden Patch: ein Patch einer Textdatei trägt genau so viele `+`- und `-`-Zeilen, wie die Dateiliste zählt —
/// sonst ist er nicht der Diff dieser Datei. Jede Zeile eines Abschnitts beginnt mit ihrem Vorzeichen; `\ No newline …` zählt nicht.
/// </summary>
internal static class Patchzaehlung
{
    private const char Plus = '+';
    private const char Minus = '-';
    private const string AbschnittKopf = "@@ ";

    public static bool PasstZurDateiliste(string patch, Dateiaenderung datei)
    {
        var (plus, minus) = ZeilenJeVorzeichen(patch);
        return plus == datei.Plus && minus == datei.Minus;
    }

    private static (int Plus, int Minus) ZeilenJeVorzeichen(string patch)
    {
        var plus = 0;
        var minus = 0;
        foreach (var zeile in patch.Split('\n'))
        {
            var istKopf = zeile.StartsWith(AbschnittKopf, StringComparison.Ordinal);
            if (istKopf)
            {
                continue;
            }
            if (zeile.StartsWith(Plus))
            {
                plus++;
            }
            if (zeile.StartsWith(Minus))
            {
                minus++;
            }
        }
        return (plus, minus);
    }
}
