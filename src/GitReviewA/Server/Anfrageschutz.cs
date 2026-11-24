using System.Net.Http.Headers;
using Microsoft.Extensions.Primitives;

namespace GitReviewA.Server;

/// <summary>
/// Schutz der zustandsändernden Endpunkte gegen fremde Webseiten: nur der eigene Origin (oder keiner, Befehlszeile),
/// nur POST, nur genau application/json — das kann eine fremde Seite ohne CORS-Vorabanfrage nicht senden.
/// Den Host prüft schon <see cref="HostPruefung"/> für jede Anfrage.
/// </summary>
internal static class Anfrageschutz
{
    private const string ErlaubteMethode = "POST";
    private const string ErlaubterMedientyp = "application/json";
    private const string ErlaubterZeichensatz = "utf-8";
    private const string ZeichensatzParameter = "charset";

    public static Schutzurteil Beurteile(string methode, StringValues origin, StringValues inhaltstyp, int port)
    {
        if (!IstEigenerOderKeinOrigin(origin, port))
        {
            return Schutzurteil.Abgewiesen(StatusCodes.Status403Forbidden, "Anfrage von fremder Herkunft abgewiesen");
        }
        var istErlaubteMethode = string.Equals(methode, ErlaubteMethode, StringComparison.Ordinal);
        if (!istErlaubteMethode)
        {
            return Schutzurteil.Abgewiesen(StatusCodes.Status405MethodNotAllowed, "nur POST erlaubt");
        }
        if (!IstGenauJson(inhaltstyp))
        {
            return Schutzurteil.Abgewiesen(StatusCodes.Status415UnsupportedMediaType, "Inhaltstyp muss application/json sein");
        }
        return Schutzurteil.Zugelassen;
    }

    private static bool IstEigenerOderKeinOrigin(StringValues origin, int port)
    {
        if (origin.Count == 0)
        {
            return true;
        }
        var eigenerOrigin = $"http://{HostPruefung.Rechneradresse}:{port}";
        var istGenauEinEigenerOrigin = origin.Count == 1 && string.Equals(origin[0], eigenerOrigin, StringComparison.Ordinal);
        return istGenauEinEigenerOrigin;
    }

    private static bool IstGenauJson(StringValues inhaltstyp)
    {
        var istGenauEinKopf = inhaltstyp.Count == 1;
        if (!istGenauEinKopf || !MediaTypeHeaderValue.TryParse(inhaltstyp[0], out var medientyp))
        {
            return false;
        }
        var istJson = string.Equals(medientyp.MediaType, ErlaubterMedientyp, StringComparison.OrdinalIgnoreCase);
        var hatNurErlaubteParameter = medientyp.Parameters.All(IstUtf8Zeichensatz);
        return istJson && hatNurErlaubteParameter;
    }

    private static bool IstUtf8Zeichensatz(NameValueHeaderValue parameter)
    {
        var istZeichensatz = string.Equals(parameter.Name, ZeichensatzParameter, StringComparison.OrdinalIgnoreCase);
        var istUtf8 = string.Equals(parameter.Value?.Trim('"'), ErlaubterZeichensatz, StringComparison.OrdinalIgnoreCase);
        return istZeichensatz && istUtf8;
    }
}
