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
        var sammlung = new Aufrufsammlung();
        for (var position = 0; position < argumente.Length; position++)
        {
            var fehlermeldung = LeseArgument(argumente, ref position, sammlung);
            if (fehlermeldung is not null)
            {
                return Aufrufergebnis.Ungueltig(fehlermeldung);
            }
        }
        return Zusammenstellen(sammlung);
    }

    private static string? LeseArgument(string[] argumente, ref int position, Aufrufsammlung sammlung)
    {
        switch (argumente[position])
        {
            case "--kein-browser":
                sammlung.BrowserOeffnen = false;
                return null;
            case "--verbose":
                sammlung.IstVerbose = true;
                return null;
            case "--quiet":
                sammlung.IstQuiet = true;
                return null;
            case "--port":
                position++;
                return LesePort(argumente, position, sammlung);
            default:
                return LeseHash(argumente[position], position, sammlung);
        }
    }

    private static string? LesePort(string[] argumente, int position, Aufrufsammlung sammlung)
    {
        var ungueltigerPort = $"--port erwartet eine Zahl von {FreierPort} bis {HoechsterPort}.";
        var wertFehlt = position >= argumente.Length;
        if (wertFehlt)
        {
            return ungueltigerPort;
        }
        var istZahl = int.TryParse(argumente[position], NumberStyles.None, CultureInfo.InvariantCulture, out var port);
        var istGueltigerPort = istZahl && port <= HoechsterPort;
        if (!istGueltigerPort)
        {
            return ungueltigerPort;
        }
        sammlung.Port = port;
        return null;
    }

    private static string? LeseHash(string argument, int position, Aufrufsammlung sammlung)
    {
        var istCommitHash = CommitHashMuster().IsMatch(argument);
        if (!istCommitHash)
        {
            return $"Argument {position + 1} ist weder eine bekannte Option noch ein Commit-Hash (4 bis 64 Hexziffern).";
        }
        sammlung.Hashes.Add(argument);
        return null;
    }

    private static Aufrufergebnis Zusammenstellen(Aufrufsammlung sammlung)
    {
        var stufenSchliessenSichAus = sammlung.IstVerbose && sammlung.IstQuiet;
        if (stufenSchliessenSichAus)
        {
            return Aufrufergebnis.Ungueltig("--verbose und --quiet schließen sich aus.");
        }
        var keinCommitAngegeben = sammlung.Hashes.Count == 0;
        if (keinCommitAngegeben)
        {
            return Aufrufergebnis.Ungueltig("Kein Commit angegeben: gitreviewA <hash…> [--port <n>] [--kein-browser] [--verbose] [--quiet]");
        }
        var startauftrag = new Startauftrag(new CommitHashes(sammlung.Hashes), sammlung.Port, sammlung.BrowserOeffnen, Mindeststufe(sammlung));
        return Aufrufergebnis.Gueltig(startauftrag);
    }

    private static Protokollstufe Mindeststufe(Aufrufsammlung sammlung)
    {
        if (sammlung.IstVerbose)
        {
            return Protokollstufe.Debug;
        }
        if (sammlung.IstQuiet)
        {
            return Protokollstufe.Fehler;
        }
        return Protokollstufe.Warnung;
    }

    [GeneratedRegex(@"^[0-9a-fA-F]{4,64}\z", RegexOptions.CultureInvariant)]
    private static partial Regex CommitHashMuster();

    private sealed class Aufrufsammlung
    {
        public List<string> Hashes { get; } = [];

        public int Port { get; set; } = FreierPort;

        public bool BrowserOeffnen { get; set; } = true;

        public bool IstVerbose { get; set; }

        public bool IstQuiet { get; set; }
    }
}
