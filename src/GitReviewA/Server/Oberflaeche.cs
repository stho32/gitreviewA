using System.Diagnostics.CodeAnalysis;
using System.Reflection;

namespace GitReviewA.Server;

internal sealed class Oberflaeche
{
    private const string Ressourcenpraefix = "web/";

    private static readonly Dictionary<string, string> InhaltstypNachEndung = new(StringComparer.OrdinalIgnoreCase)
    {
        [".html"] = "text/html; charset=utf-8",
        [".js"] = "text/javascript",
        [".css"] = "text/css",
        [".woff2"] = "font/woff2",
        [".txt"] = "text/plain; charset=utf-8",
    };

    private readonly Dictionary<string, Oberflaechendatei> dateiNachPfad;

    private Oberflaeche(Dictionary<string, Oberflaechendatei> dateiNachPfad)
    {
        this.dateiNachPfad = dateiNachPfad;
    }

    public static Oberflaeche AusDemProgramm()
    {
        var programm = typeof(Oberflaeche).Assembly;
        var dateiNachPfad = new Dictionary<string, Oberflaechendatei>(StringComparer.Ordinal);
        foreach (var ressourcenname in programm.GetManifestResourceNames())
        {
            var pfad = ressourcenname.Replace('\\', '/');
            var gehoertZurOberflaeche = pfad.StartsWith(Ressourcenpraefix, StringComparison.Ordinal);
            var inhaltstyp = InhaltstypVon(pfad);
            if (!gehoertZurOberflaeche || inhaltstyp is null)
            {
                continue;
            }
            dateiNachPfad[pfad[Ressourcenpraefix.Length..]] = new Oberflaechendatei(LiesRessource(programm, ressourcenname), inhaltstyp);
        }
        return new Oberflaeche(dateiNachPfad);
    }

    public bool VersucheZuFinden(string pfad, [NotNullWhen(true)] out Oberflaechendatei? datei)
    {
        return dateiNachPfad.TryGetValue(pfad, out datei);
    }

    private static string? InhaltstypVon(string pfad)
    {
        InhaltstypNachEndung.TryGetValue(Path.GetExtension(pfad), out var inhaltstyp);
        return inhaltstyp;
    }

    private static byte[] LiesRessource(Assembly programm, string ressourcenname)
    {
        using var strom = programm.GetManifestResourceStream(ressourcenname);
        if (strom is null)
        {
            throw new InvalidOperationException($"eingebettete Ressource {ressourcenname} fehlt");
        }
        using var puffer = new MemoryStream();
        strom.CopyTo(puffer);
        return puffer.ToArray();
    }
}
