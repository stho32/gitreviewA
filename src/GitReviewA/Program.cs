using GitReviewA.Anmerkungen;
using GitReviewA.Aufruf;
using GitReviewA.Beenden;
using GitReviewA.Browser;
using GitReviewA.Dateien;
using GitReviewA.Diff;
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
        var startauftrag = aufruf.Startauftrag;
        var protokoll = NeuesProtokoll(startauftrag.Mindeststufe);
        using var abbruchsignale = Abbruchsignale.Abfangen();
        var anfrage = new Aufrufanfrage(startauftrag, StandardeingabeDesProzesses(), Environment.CurrentDirectory);
        var folge = await AufrufInteractor.StarteAsync(anfrage, protokoll);
        if (!folge.IstErfolg)
        {
            MeldeAufruffehler(folge.Fehler, protokoll);
            return folge.Fehler.ExitCode;
        }
        try
        {
            return await LaufeBisZumEnde(startauftrag, folge.Commits, folge.Arbeitsbaumwurzel, abbruchsignale, protokoll);
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

    private static void MeldeAufruffehler(Aufruffehler fehler, StderrProtokoll protokoll)
    {
        protokoll.Melde(Protokollstufe.Fehler, "Aufruf", fehler.Meldung);
        var hatDebugtext = fehler.Debugtext.Length > 0;
        if (hatDebugtext)
        {
            protokoll.Melde(Protokollstufe.Debug, "Aufruf", fehler.Debugtext);
        }
    }

    private static async Task<int> LaufeBisZumEnde(Startauftrag startauftrag, Commitzeilen commits, string arbeitsbaumwurzel, Abbruchsignale abbruchsignale, StderrProtokoll protokoll)
    {
        var uebersichtsquelle = new GitUebersichtsquelle(commits, arbeitsbaumwurzel);
        var zusammenquelle = new GitZusammenquelle(commits, arbeitsbaumwurzel);
        await using var server = await Webserver.StartenAsync(startauftrag.Port, commits, new GitDateiquelle(arbeitsbaumwurzel), new GitDiffquelle(arbeitsbaumwurzel), uebersichtsquelle, zusammenquelle, Oberflaeche.AusDemProgramm(), protokoll, new GitSprungquelle(arbeitsbaumwurzel), startauftrag.Muster);
        protokoll.MeldeStart(server.Adresse);
        if (startauftrag.BrowserOeffnen)
        {
            OeffneBrowser(server.Adresse, protokoll);
        }
        await WartenBisBeendetOderAbgebrochen(server, abbruchsignale);
        var ausgang = AbbruchEntscheidung.Entscheide(server.Anmerkungen.IstAbgeschlossen);
        GibErgebnisOderAbbruchAus(ausgang, server, protokoll);
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

    private static void GibErgebnisOderAbbruchAus(Laufausgang ausgang, Webserver server, StderrProtokoll protokoll)
    {
        if (ausgang.IstAbgebrochen)
        {
            protokoll.Melde(Protokollstufe.Warnung, "Abbruch", "Review abgebrochen");
            return;
        }
        var kopie = new ErgebnisKopierenInteractor(server.Anmerkungen, server.DateiAbhaken).Erzeuge();
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
