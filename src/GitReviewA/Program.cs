using GitReviewA.Anmerkungen;
using GitReviewA.Aufruf;
using GitReviewA.Beenden;
using GitReviewA.Bild;
using GitReviewA.Browser;
using GitReviewA.Dateiansicht;
using GitReviewA.Dateien;
using GitReviewA.Diff;
using GitReviewA.Fremdtext;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Protokoll;
using GitReviewA.Server;
using GitReviewA.Sprung;
using GitReviewA.Zusammen;

namespace GitReviewA;

internal static class Program
{
    private const int ExitLaufGescheitert = 1;
    private const string BrowserVariable = "GITREVIEWA_BROWSER";

    public static async Task<int> Main(string[] args)
    {
        var aufruf = Aufrufleser.Lesen(args);
        if (!aufruf.IstGueltig)
        {
            NeuesProtokoll(Protokollstufe.Warnung).Melde(Protokollstufe.Fehler, "Aufruf", aufruf.Fehlermeldung);
            return AufruffehlerMeldungen.ExitCode;
        }
        using var abbruchsignale = Abbruchsignale.Abfangen();
        if (aufruf.Dateiaufruf is { } dateiaufruf)
        {
            var dateiprotokoll = NeuesProtokoll(dateiaufruf.Mindeststufe);
            return await LaufeMitEinerFehlerzeileAsync(
                () => LaufeDateiansichtAsync(dateiaufruf, aufruf.Laufart, abbruchsignale, dateiprotokoll),
                dateiprotokoll);
        }
        var startauftrag = aufruf.Startauftrag
            ?? throw new InvalidOperationException("gültiger Aufruf ohne Startauftrag");
        var protokoll = NeuesProtokoll(startauftrag.Mindeststufe);
        var anfrage = new Aufrufanfrage(startauftrag, StandardeingabeDesProzesses(), Environment.CurrentDirectory);
        var folge = await AufrufInteractor.StarteAsync(anfrage, protokoll);
        if (!folge.IstErfolg)
        {
            MeldeAufruffehler(folge.Fehler, protokoll);
            return folge.Fehler.ExitCode;
        }
        return await LaufeMitEinerFehlerzeileAsync(
            () => LaufeBisZumEnde(startauftrag, aufruf.Laufart, folge.Commits, folge.Arbeitsbaumwurzel, abbruchsignale, protokoll),
            protokoll);
    }

    /// <summary>
    /// Ein Fangen für beide Laufarten: ein Laufzeitfehler wird zu genau einer Zeile und Exit 1 — ein belegter Port endet nie
    /// mit Exit 134 und Stacktrace (R00043, Kriterium 10; Angriffsmatrix X7). Die Kontexte „git“ und „Server“ bleiben getrennt.
    /// </summary>
    private static async Task<int> LaufeMitEinerFehlerzeileAsync(Func<Task<int>> lauf, StderrProtokoll protokoll)
    {
        try
        {
            return await lauf();
        }
        catch (GitZuGross zuGross)
        {
            protokoll.Melde(Protokollstufe.Warnung, "git", $"Ausgabe über der Ausgabegrenze ({zuGross.UiGrund}) — ohne fremden Text, der Aufruf steht im Debug");
            protokoll.Melde(Protokollstufe.Debug, "git", zuGross.Message);
            return ExitLaufGescheitert;
        }
        catch (GitFehler fehler)
        {
            protokoll.Melde(Protokollstufe.Fehler, "git", fehler.Message);
            return ExitLaufGescheitert;
        }
        catch (IOException fehler)
        {
            protokoll.Melde(Protokollstufe.Fehler, "Server", $"Server ließ sich nicht starten: {fehler.Message}");
            return ExitLaufGescheitert;
        }
    }

    /// <summary>
    /// Der Lauf der Dateiansicht (R00043, B4204): Gründe vor dem Serverstart als eine Zeile je Angabe, sonst Server und Warten.
    /// „Schließen“ endet mit Exit 0, ein Signal oder ein anderes Ende mit „Dateiansicht abgebrochen“ und Exit 130; stdout bleibt leer.
    /// </summary>
    private static async Task<int> LaufeDateiansichtAsync(Dateiaufruf aufruf, Laufart laufart, Abbruchsignale abbruchsignale, StderrProtokoll protokoll)
    {
        const int ExitAbgebrochen = 130;
        const int HoechsteGrundzeilenlaenge = 300;
        var buchung = new Quellenbuchung();
        var interactor = new DateiansichtStartInteractor(
            new DateiLeser(buchung),
            new GitCommitDateiquelle(Environment.CurrentDirectory, buchung));
        var ausgang = interactor.Starte(aufruf);
        if (!ausgang.IstErfolg)
        {
            if (ausgang.Grenzenmeldung is string grenzenmeldung)
            {
                protokoll.Melde(Protokollstufe.Fehler, "Dateiansicht", grenzenmeldung);
                return AufruffehlerMeldungen.ExitCode;
            }
            foreach (var fehler in ausgang.Fehler)
            {
                var grundzeile = $"{UnsichtbareZeichen.AlsMarken(fehler.Angabe)}: {QuellengrundMeldungen.Meldung(fehler.Grund)}";
                protokoll.Melde(Protokollstufe.Fehler, "Dateiansicht", Kuerze(grundzeile, HoechsteGrundzeilenlaenge));
            }
            return AufruffehlerMeldungen.ExitCode;
        }
        if (abbruchsignale.IstAbbruchAngefordert)
        {
            Abbruchzeile.Melde(protokoll, laufart);
            return ExitAbgebrochen;
        }
        var stand = ausgang.Stand ?? throw new InvalidOperationException("Erfolg ohne Stand");
        await using var server = await DateiansichtServer.StarteAsync(stand, aufruf.Port, Oberflaeche.AusDemProgramm(), protokoll);
        protokoll.MeldeStart(server.Adresse);
        if (aufruf.BrowserOeffnen)
        {
            OeffneBrowser(server.Adresse, protokoll);
        }
        await server.WartenBisBeendetAsync();
        if (server.IstGeschlossen)
        {
            return 0;
        }
        Abbruchzeile.Melde(protokoll, laufart);
        return ExitAbgebrochen;
    }

    private static string Kuerze(string text, int hoechstlaenge)
    {
        if (text.Length <= hoechstlaenge)
        {
            return text;
        }
        return string.Concat(text.AsSpan(0, hoechstlaenge - 1), "…");
    }

    private static void MeldeAufruffehler(Aufruffehler fehler, StderrProtokoll protokoll)
    {
        protokoll.Melde(Protokollstufe.Fehler, "Aufruf", fehler.Meldung);
        var hatDebugtext = fehler.Debugtext.Length > 0;
        if (hatDebugtext)
        {
            protokoll.Melde(Protokollstufe.Debug, "Aufruf", fehler.Debugtext);
        }
    }

    private static async Task<int> LaufeBisZumEnde(Startauftrag startauftrag, Laufart laufart, Commitzeilen commits, string arbeitsbaumwurzel, Abbruchsignale abbruchsignale, StderrProtokoll protokoll)
    {
        var uebersichtsquelle = new GitUebersichtsquelle(commits, arbeitsbaumwurzel);
        var zusammenquelle = new GitZusammenquelle(commits, arbeitsbaumwurzel);
        await using var server = await Webserver.StartenAsync(startauftrag.Port, commits, new GitDateiquelle(arbeitsbaumwurzel), new GitDiffquelle(arbeitsbaumwurzel), uebersichtsquelle, zusammenquelle, Oberflaeche.AusDemProgramm(), protokoll, new GitSprungquelle(arbeitsbaumwurzel), startauftrag.Muster, new GitBildquelle(arbeitsbaumwurzel), arbeitsbaumwurzel, abbruchsignale.Laufende);
        protokoll.MeldeStart(server.Adresse);
        if (startauftrag.BrowserOeffnen)
        {
            OeffneBrowser(server.Adresse, protokoll);
        }
        await WartenBisBeendetOderAbgebrochen(server, abbruchsignale);
        var ausgang = AbbruchEntscheidung.Entscheide(server.Laufende.Zustand);
        GibErgebnisOderAbbruchAus(ausgang, server, laufart, protokoll);
        return ausgang.ExitCode;
    }

    private static async Task WartenBisBeendetOderAbgebrochen(Webserver server, Abbruchsignale abbruchsignale)
    {
        var kamAbbruchVorDemServerstart = abbruchsignale.IstAbbruchAngefordert;
        if (kamAbbruchVorDemServerstart)
        {
            return;
        }
        await server.WartenBisBeendetAsync();
    }

    private static void GibErgebnisOderAbbruchAus(Laufausgang ausgang, Webserver server, Laufart laufart, StderrProtokoll protokoll)
    {
        if (ausgang.IstAbgebrochen)
        {
            Abbruchzeile.Melde(protokoll, laufart);
            return;
        }
        var kopie = server.Ergebnis.Erzeuge();
        StdoutErgebnis.Schreibe(kopie.Ergebnis);
    }

    private static Standardeingabe StandardeingabeDesProzesses()
    {
        var istTerminal = !Console.IsInputRedirected;
        return new Standardeingabe(new StreamReader(Console.OpenStandardInput()), istTerminal);
    }

    private static void OeffneBrowser(string adresse, StderrProtokoll protokoll)
    {
        var start = BrowserStart.Fuer(adresse, Environment.GetEnvironmentVariable(BrowserVariable), BrowserStart.DieserRechner());
        try
        {
            BrowserOeffner.Oeffnen(start);
        }
        catch (BrowserFehler fehler)
        {
            protokoll.Melde(Protokollstufe.Warnung, "Browser", fehler.Message);
        }
    }

    private static StderrProtokoll NeuesProtokoll(Protokollstufe mindeststufe)
    {
        return new StderrProtokoll(Console.Error, TimeProvider.System, mindeststufe);
    }
}
