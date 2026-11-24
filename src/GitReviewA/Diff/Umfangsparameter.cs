using GitReviewA.Git;
using Microsoft.Extensions.Primitives;

namespace GitReviewA.Diff;

/// <summary>
/// Der Abfrageparameter `umfang` der Diff-Endpunkte: ohne Angabe gilt „nur Änderungen“, sonst genau ein Wert aus der festen Liste,
/// Groß- und Kleinschreibung beachtet.
/// </summary>
internal static class Umfangsparameter
{
    public const string Name = "umfang";

    private static readonly Dictionary<string, Diffumfang> NachWert = new(StringComparer.Ordinal)
    {
        ["aenderungen"] = Diffumfang.Aenderungen,
        ["ganz"] = Diffumfang.Ganz,
    };

    public static bool Lies(StringValues werte, out Diffumfang umfang)
    {
        umfang = Diffumfang.Aenderungen;
        var umfangFehlt = werte.Count == 0;
        if (umfangFehlt)
        {
            return true;
        }
        var istGenauEinWert = werte.Count == 1;
        return istGenauEinWert && NachWert.TryGetValue(werte.ToString(), out umfang);
    }
}
