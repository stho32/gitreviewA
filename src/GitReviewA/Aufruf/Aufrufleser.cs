using System.Globalization;
using System.Text.RegularExpressions;
using GitReviewA.Protokoll;

namespace GitReviewA.Aufruf;

internal static partial class Aufrufleser
{
    public const int FreierPort = 0;
    private const int HoechsterPort = 65535;

    public static Aufrufergebnis Lesen(string[] argumente)
    {
        var hashes = new List<string>();
        var port = FreierPort;
        var browserOeffnen = true;
        var istVerbose = false;
        var istQuiet = false;

        for (var position = 0; position < argumente.Length; position++)
        {
            var argument = argumente[position];
            switch (argument)
            {
                case "--kein-browser":
                    browserOeffnen = false;
                    break;
                case "--verbose":
                    istVerbose = true;
                    break;
                case "--quiet":
                    istQuiet = true;
                    break;
                case "--port":
                    position++;
                    var portergebnis = LesePort(argumente, position);
                    if (portergebnis is null)
                    {
                        return Aufrufergebnis.Ungueltig($"--port erwartet eine Zahl von {FreierPort} bis {HoechsterPort}.");
                    }
                    port = portergebnis.Value;
                    break;
                default:
                    var istCommitHash = CommitHashMuster().IsMatch(argument);
                    if (!istCommitHash)
                    {
                        return Aufrufergebnis.Ungueltig(KeinHashMeldung(position));
                    }
                    hashes.Add(argument);
                    break;
            }
        }

        return Zusammenstellen(hashes, port, browserOeffnen, istVerbose, istQuiet);
    }

    private static int? LesePort(string[] argumente, int position)
    {
        var wertFehlt = position >= argumente.Length;
        if (wertFehlt)
        {
            return null;
        }
        var istZahl = int.TryParse(argumente[position], NumberStyles.None, CultureInfo.InvariantCulture, out var port);
        var istGueltigerPort = istZahl && port <= HoechsterPort;
        if (!istGueltigerPort)
        {
            return null;
        }
        return port;
    }

    private static string KeinHashMeldung(int position)
    {
        return $"Argument {position + 1} ist weder eine bekannte Option noch ein Commit-Hash (4 bis 64 Hexziffern).";
    }

    private static Aufrufergebnis Zusammenstellen(List<string> hashes, int port, bool browserOeffnen, bool istVerbose, bool istQuiet)
    {
        var stufenSchliessenSichAus = istVerbose && istQuiet;
        if (stufenSchliessenSichAus)
        {
            return Aufrufergebnis.Ungueltig("--verbose und --quiet schließen sich aus.");
        }
        var keinCommitAngegeben = hashes.Count == 0;
        if (keinCommitAngegeben)
        {
            return Aufrufergebnis.Ungueltig("Kein Commit angegeben: gitreviewA <hash…> [--port <n>] [--kein-browser] [--verbose] [--quiet]");
        }
        var mindeststufe = Mindeststufe(istVerbose, istQuiet);
        return Aufrufergebnis.Gueltig(new Startauftrag(new CommitHashes(hashes), port, browserOeffnen, mindeststufe));
    }

    private static Protokollstufe Mindeststufe(bool istVerbose, bool istQuiet)
    {
        if (istVerbose)
        {
            return Protokollstufe.Debug;
        }
        if (istQuiet)
        {
            return Protokollstufe.Fehler;
        }
        return Protokollstufe.Warnung;
    }

    [GeneratedRegex(@"^[0-9a-fA-F]{4,64}\z", RegexOptions.CultureInvariant)]
    private static partial Regex CommitHashMuster();
}
