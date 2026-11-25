using GitReviewA.Git;
using Microsoft.Extensions.Primitives;

namespace GitReviewA.Diff;

/// <summary>
/// Der Abfrageparameter `leerraum` der Diff-Endpunkte: ohne Angabe gilt „beachten“ (Start), sonst genau ein Wert aus der festen Liste,
/// Groß- und Kleinschreibung beachtet. Ein unbekannter Wert endet vor jedem `git`-Aufruf als 400 (R00026, Sicherheit).
/// </summary>
internal static class Leerraumparameter
{
    public const string Name = "leerraum";

    private static readonly Dictionary<string, Leerraum> NachWert = new(StringComparer.Ordinal)
    {
        ["beachten"] = Leerraum.Beachten,
        ["ignorieren"] = Leerraum.Ignorieren,
    };

    public static bool Lies(StringValues werte, out Leerraum leerraum)
    {
        leerraum = Leerraum.Beachten;
        var stellungFehlt = werte.Count == 0;
        if (stellungFehlt)
        {
            return true;
        }
        var istGenauEinWert = werte.Count == 1;
        return istGenauEinWert && NachWert.TryGetValue(werte.ToString(), out leerraum);
    }
}
