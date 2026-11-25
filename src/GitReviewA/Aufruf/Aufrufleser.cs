using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using GitReviewA.Protokoll;

namespace GitReviewA.Aufruf;

internal static class Aufrufleser
{
    public const int FreierPort = 0;
    private const int HoechsterPort = 65535;
    private const string StdinArgument = "-";
    private const string Bereichstrenner = "..";
    private const string Aufrufform = "gitreviewA <hash…> | <von>..<bis>… | - [--port <n>] [--kein-browser] [--ignore <muster>] [--verbose] [--quiet]";

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
            case "--ignore":
                position++;
                return LeseMuster(argumente, position, sammlung);
            default:
                sammlung.Auswahlargumente.Add(new Auswahlargument(argumente[position], position + 1));
                return null;
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

    private static string? LeseMuster(string[] argumente, int position, Aufrufsammlung sammlung)
    {
        var wertFehlt = position >= argumente.Length;
        if (wertFehlt)
        {
            return "--ignore erwartet ein Muster.";
        }
        var ergebnis = Musterpruefer.Pruefe(argumente[position], sammlung.Muster.Count);
        if (ergebnis.Grund is Musterablehnungsgrund ablehnungsgrund)
        {
            return Musterpruefer.Meldung(ablehnungsgrund);
        }
        sammlung.Muster.Add(argumente[position]);
        return null;
    }

    private static Aufrufergebnis Zusammenstellen(Aufrufsammlung sammlung)
    {
        var stufenSchliessenSichAus = sammlung.IstVerbose && sammlung.IstQuiet;
        if (stufenSchliessenSichAus)
        {
            return Aufrufergebnis.Ungueltig("--verbose und --quiet schließen sich aus.");
        }
        var keineAuswahlAngegeben = sammlung.Auswahlargumente.Count == 0;
        if (keineAuswahlAngegeben)
        {
            return Aufrufergebnis.Ungueltig($"Kein Commit angegeben: {Aufrufform}");
        }
        var auswahl = BestimmeAuswahl(sammlung.Auswahlargumente);
        if (!auswahl.IstGueltig)
        {
            return Aufrufergebnis.Ungueltig(auswahl.Fehlermeldung);
        }
        var startauftrag = new Startauftrag(auswahl.Auswahl, sammlung.Port, sammlung.BrowserOeffnen, Mindeststufe(sammlung), new Musterliste(sammlung.Muster));
        return Aufrufergebnis.Gueltig(startauftrag);
    }

    private static Auswahlergebnis BestimmeAuswahl(List<Auswahlargument> argumente)
    {
        var nenntStdin = argumente.Exists(argument => argument.Text == StdinArgument);
        if (nenntStdin)
        {
            return StdinAuswahl(argumente);
        }
        var nenntBereich = argumente.Exists(argument => argument.Text.Contains(Bereichstrenner, StringComparison.Ordinal));
        if (nenntBereich)
        {
            return BereichsAuswahl(argumente);
        }
        return EinzelcommitAuswahl(argumente);
    }

    private static Auswahlergebnis StdinAuswahl(List<Auswahlargument> argumente)
    {
        var istEinzigesAuswahlargument = argumente.Count == 1;
        if (!istEinzigesAuswahlargument)
        {
            return Auswahlergebnis.Ungueltig("- (Hashes über stdin) ist das einzige Auswahl-Argument: daneben stehen weder Hashes noch Bereiche noch ein zweites -.");
        }
        return Auswahlergebnis.Gueltig(Auswahl.UeberStdin());
    }

    private static Auswahlergebnis BereichsAuswahl(List<Auswahlargument> argumente)
    {
        foreach (var argument in argumente)
        {
            var istEinzelhash = !argument.Text.Contains(Bereichstrenner, StringComparison.Ordinal);
            if (istEinzelhash)
            {
                return Auswahlergebnis.Ungueltig($"Argument {argument.Position} steht ohne .. neben einem Bereich: ein Bereichsaufruf nennt nur Bereiche (<von>..<bis>).");
            }
            var istZulaessig = Bereichspruefer.IstZulaessigerBereich(argument.Text);
            if (!istZulaessig)
            {
                return Auswahlergebnis.Ungueltig($"Argument {argument.Position} ist kein zulässiger Bereich: erwartet wird <von>..<bis>, je Endpunkt ein Commit-Hash, HEAD oder ein Zweig- bzw. Tag-Name aus A-Z a-z 0-9 . _ / -, danach ~<n> oder ^<n>.");
            }
        }
        return Auswahlergebnis.Gueltig(Auswahl.AusBereichen(new Bereiche(argumente.Select(argument => argument.Text))));
    }

    private static Auswahlergebnis EinzelcommitAuswahl(List<Auswahlargument> argumente)
    {
        foreach (var argument in argumente)
        {
            var istCommitHash = CommitHashForm.IstCommitHash(argument.Text);
            if (!istCommitHash)
            {
                return Auswahlergebnis.Ungueltig($"Argument {argument.Position} ist weder eine bekannte Option noch ein Commit-Hash ({CommitHashForm.Beschreibung}).");
            }
        }
        return Auswahlergebnis.Gueltig(Auswahl.AusEinzelcommits(new CommitHashes(argumente.Select(argument => argument.Text))));
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

    private sealed class Aufrufsammlung
    {
        public List<Auswahlargument> Auswahlargumente { get; } = [];

        public List<string> Muster { get; } = [];

        public int Port { get; set; } = FreierPort;

        public bool BrowserOeffnen { get; set; } = true;

        public bool IstVerbose { get; set; }

        public bool IstQuiet { get; set; }
    }

    private sealed record Auswahlargument(string Text, int Position);

    private sealed record Auswahlergebnis(Auswahl? Auswahl, string Fehlermeldung)
    {
        [MemberNotNullWhen(true, nameof(Auswahl))]
        public bool IstGueltig => Auswahl is not null;

        public static Auswahlergebnis Gueltig(Auswahl auswahl)
        {
            return new Auswahlergebnis(auswahl, string.Empty);
        }

        public static Auswahlergebnis Ungueltig(string fehlermeldung)
        {
            return new Auswahlergebnis(null, fehlermeldung);
        }
    }
}
