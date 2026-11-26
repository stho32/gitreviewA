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
    private const string DateienOption = "--dateien";
    private const string Doppelstrich = "--";
    private const string Dateienform = "gitreviewA --dateien <datei> [--port <n>] [--kein-browser] [--verbose] [--quiet]";
    private const string NichtBeides = "Review oder Dateiansicht, nicht beides: --dateien steht allein, ohne Hash, Bereich, - oder --ignore.";

    public static Aufrufergebnis Lesen(string[] argumente)
    {
        var sammlung = new Aufrufsammlung();
        var nachDoppelstrich = false;
        for (var position = 0; position < argumente.Length; position++)
        {
            if (!nachDoppelstrich && argumente[position] == Doppelstrich)
            {
                nachDoppelstrich = true;
                continue;
            }
            var fehlermeldung = nachDoppelstrich
                ? NimmAngabeNachDoppelstrich(argumente[position], position, sammlung)
                : LeseArgument(argumente, ref position, sammlung);
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
            case DateienOption:
                sammlung.IstDateiansicht = true;
                return null;
            default:
                var argument = new Auswahlargument(argumente[position], position + 1);
                if (sammlung.IstDateiansicht)
                {
                    return NimmDateiangabe(argument, sammlung);
                }
                sammlung.Auswahlargumente.Add(argument);
                return null;
        }
    }

    /// <summary>
    /// Vor <c>--</c> ist ein Argument, das mit <c>-</c> beginnt und keine bekannte Option ist, ein Aufruffehler — sonst würde
    /// <c>--dateien -x.sql</c> stillschweigend die Datei zeigen (R00043, Kriterium 3; Angriffsmatrix P10). <c>-</c> allein
    /// bleibt der Review-Auswahl vorbehalten und fällt in die Prüfung „Review oder Dateiansicht, nicht beides“.
    /// </summary>
    private static string? NimmDateiangabe(Auswahlargument argument, Aufrufsammlung sammlung)
    {
        var istUnbekannteOption = argument.Text.StartsWith('-') && argument.Text != StdinArgument;
        if (istUnbekannteOption)
        {
            return $"Argument {argument.Position} ist eine unbekannte Option: eine Angabe, die mit - beginnt, steht nach -- (gitreviewA --dateien -- -x.sql).";
        }
        sammlung.Quellen.Add(argument);
        return null;
    }

    /// <summary>Nach <c>--</c> ist jedes Argument eine Angabe; in der Dateiansicht ist sie die gezeigte Datei, im Review eine Auswahl.</summary>
    private static string? NimmAngabeNachDoppelstrich(string text, int position, Aufrufsammlung sammlung)
    {
        var argument = new Auswahlargument(text, position + 1, NachDoppelstrich: true);
        if (sammlung.IstDateiansicht)
        {
            sammlung.Quellen.Add(argument);
        }
        else
        {
            sammlung.Auswahlargumente.Add(argument);
        }
        return null;
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
        if (sammlung.IstDateiansicht)
        {
            return StelleDateiaufrufZusammen(sammlung);
        }
        return StelleReviewZusammen(sammlung);
    }

    /// <summary>
    /// Die Dateiansicht zeigt nur Dateien vom Datenträger: ein Hash, ein Bereich, <c>-</c> oder <c>--ignore</c> daneben wäre
    /// ein zweiter Lauf. Die Prüfung steht hier einmal; Server, Seite, Ende und Abbruch lesen nur das Ergebnis.
    /// </summary>
    private static Aufrufergebnis StelleDateiaufrufZusammen(Aufrufsammlung sammlung)
    {
        var nenntReviewAuswahl = sammlung.Auswahlargumente.Count > 0
            || sammlung.Muster.Count > 0
            || sammlung.Quellen.Exists(quelle => IstReviewauswahl(quelle));
        if (nenntReviewAuswahl)
        {
            return Aufrufergebnis.Ungueltig(NichtBeides);
        }
        var quellen = sammlung.Quellen.Select(quelle => quelle.Text).ToList();
        if (quellen.Count == 0)
        {
            return Aufrufergebnis.Ungueltig($"Die Dateiansicht braucht eine Angabe: {Dateienform}");
        }
        var dateiaufruf = new Dateiaufruf(quellen, sammlung.Port, sammlung.BrowserOeffnen, Mindeststufe(sammlung));
        return Aufrufergebnis.Gueltig(dateiaufruf);
    }

    /// <summary>Ein Argument, das nur der Review versteht: stdin, ein Hash oder ein Bereich (R00043, Kriterium 2).
        /// Ein Pfad mit dem Segment <c>..</c> (<c>unter/../a.sql</c>) ist dagegen eine Angabe und bleibt zeigbar.</summary>
    private static bool IstReviewauswahl(Auswahlargument argument)
    {
        if (argument.Text == StdinArgument || CommitHashForm.IstCommitHash(argument.Text))
        {
            return true;
        }
        return Bereichspruefer.IstZulaessigerBereich(argument.Text) && !IstPfadMitAufstieg(argument.Text);
    }

    private static bool IstPfadMitAufstieg(string text)
    {
        return text.StartsWith("../", StringComparison.Ordinal)
            || text.Contains("/../", StringComparison.Ordinal)
            || text.EndsWith("/..", StringComparison.Ordinal);
    }

    private static Aufrufergebnis StelleReviewZusammen(Aufrufsammlung sammlung)
    {
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

        /// <summary>Die Angaben der Dateiansicht in Aufrufreihenfolge (die Quellen der Kommandozeile, ohne Optionen).</summary>
        public List<Auswahlargument> Quellen { get; } = [];

        public List<string> Muster { get; } = [];

        public bool IstDateiansicht { get; set; }

        public int Port { get; set; } = FreierPort;

        public bool BrowserOeffnen { get; set; } = true;

        public bool IstVerbose { get; set; }

        public bool IstQuiet { get; set; }
    }

    private sealed record Auswahlargument(string Text, int Position, bool NachDoppelstrich = false);

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
