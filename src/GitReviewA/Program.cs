using GitReviewA.Aufruf;
using GitReviewA.Beenden;
using GitReviewA.Browser;
using GitReviewA.Git;
using GitReviewA.Protokoll;
using GitReviewA.Server;

namespace GitReviewA;

internal static class Program
{
    private const int ExitBeendet = 0;
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
        try
        {
            await LaufeBisZumEnde(startauftrag, protokoll);
            return ExitBeendet;
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

    private static async Task LaufeBisZumEnde(Startauftrag startauftrag, StderrProtokoll protokoll)
    {
        var commits = GitLeser.Lesen(startauftrag.Hashes, Environment.CurrentDirectory);
        await using var server = await Webserver.StartenAsync(startauftrag.Port, commits, Oberflaeche.AusDemProgramm(), protokoll);
        protokoll.MeldeStart(server.Adresse);
        if (startauftrag.BrowserOeffnen)
        {
            OeffneBrowser(server.Adresse, protokoll);
        }
        await server.WartenBisBeendetAsync();
        if (server.Anmerkungen.IstAbgeschlossen)
        {
            StdoutErgebnis.Schreibe(ErgebnisFormatierer.Formatiere(server.Anmerkungen.Schnappschuss()));
        }
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
