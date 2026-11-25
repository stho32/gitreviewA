using Microsoft.Extensions.Primitives;

namespace GitReviewA.Server;

/// <summary>
/// Die Herkunft einer Browser-Anfrage: eigen ist genau der eigene Ursprung (<c>http://127.0.0.1:&lt;port&gt;</c>) oder
/// gar keiner (Befehlszeile und Navigation). <c>Origin: null</c>, jeder andere Ursprung und ein gekreuzter
/// Browser-Unteraufruf (<c>Sec-Fetch-Site: cross-site</c> — den sendet auch ein <c>&lt;img&gt;</c>/<c>&lt;script&gt;</c>
/// ohne Origin-Kopf) sind fremd. Eine Stelle für alle Endpunkte, damit keine Pfadschreibweise sie umgeht.
/// </summary>
internal static class FremdeHerkunft
{
    public const string Querherkunftskopf = "Sec-Fetch-Site";

    public const string Meldung = "Anfrage von fremder Herkunft abgewiesen";

    private const string GekreuzteHerkunft = "cross-site";

    public static bool IstFremd(StringValues ursprung, StringValues querherkunft, int port)
    {
        var istFremderUrsprung = !IstEigenerOderKeiner(ursprung, port);
        return istFremderUrsprung || IstGekreuzt(querherkunft);
    }

    /// <summary>Kein Ursprung (Befehlszeile, Navigation) oder genau der eigene — die Entity des Laufs, nie ein Präfix.</summary>
    public static bool IstEigenerOderKeiner(StringValues ursprung, int port)
    {
        if (ursprung.Count == 0)
        {
            return true;
        }
        var eigenerUrsprung = $"http://{HostPruefung.Rechneradresse}:{port}";
        return ursprung.Count == 1 && string.Equals(ursprung[0], eigenerUrsprung, StringComparison.Ordinal);
    }

    /// <summary>Mehr als ein Kopf stammt nie von einem Browser und gilt als fremd.</summary>
    private static bool IstGekreuzt(StringValues querherkunft)
    {
        if (querherkunft.Count == 0)
        {
            return false;
        }
        if (querherkunft.Count > 1)
        {
            return true;
        }
        return string.Equals(querherkunft[0]?.Trim(), GekreuzteHerkunft, StringComparison.OrdinalIgnoreCase);
    }
}
