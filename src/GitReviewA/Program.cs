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

namespace GitReviewA;

internal static class Program
{
    private const int ExitLaufGescheitert = 1;
    private const int ExitUngueltigerAufruf = 2;
    private const string BrowserVariable = "GITREVIEWA_BROWSER";

    public static async Task<int> Main(string[] args)
    {
        var aufruf = Aufrufleser.Lesen(args);
        if (!aufruf.IstGueltig)
        {
            NeuesProtokoll(Protokollstufe.Warnung).Melde(Protokollstufe.Fehler, "Aufruf", aufruf.Fehlermeldung);
            return ExitUngueltigerAufruf;
        }
        var startauftrag = aufruf.Startauftrag;
        var protokoll = NeuesProtokoll(startauftrag.Mindeststufe);
        using var abbruchsignale = Abbruchsignale.Abfangen();
        try
        {
            return await LaufeBisZumEnde(startauftrag, abbruchsignale, protokoll);
        }
        catch (AuswahlFehler fehler)
        {
            protokoll.Melde(Protokollstufe.Fehler, "Auswahl", fehler.Message);
            return ExitUngueltigerAufruf;
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

    private static async Task<int> LaufeBisZumEnde(Startauftrag startauftrag, Abbruchsignale abbruchsignale, StderrProtokoll protokoll)
    {
        var commits = await CommitsDerAuswahl.LesenAsync(startauftrag.Auswahl, StandardeingabeDesProzesses(), Environment.CurrentDirectory, protokoll);
        var arbeitsordner = GitLeser.WurzelLesen(Environment.CurrentDirectory);
        var uebersichtsquelle = new GitUebersichtsquelle(commits, arbeitsordner);
        await using var server = await Webserver.StartenAsync(startauftrag.Port, commits, new GitDateiquelle(arbeitsordner), new GitDiffquelle(arbeitsordner), uebersichtsquelle, Oberflaeche.AusDemProgramm(), protokoll);
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
        StdoutErgebnis.Schreibe(ErgebnisFormatierer.Formatiere(server.Anmerkungen.Schnappschuss(), server.DateiAbhaken.Ergebnisstand()));
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
