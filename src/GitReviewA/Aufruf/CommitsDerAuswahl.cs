using GitReviewA.Git;
using GitReviewA.Protokoll;

namespace GitReviewA.Aufruf;

internal static class CommitsDerAuswahl
{
    private const string Kontext = "Auswahl";
    private static readonly TimeSpan StdinFrist = TimeSpan.FromSeconds(10);

    public static async Task<Commitzeilen> LesenAsync(Auswahl auswahl, Standardeingabe stdin, string arbeitsordner, StderrProtokoll protokoll)
    {
        var commits = await LeseMitGrundAsync(auswahl, stdin, arbeitsordner);
        Beurteile(commits, protokoll);
        return commits;
    }

    /// <summary>Ein gescheitertes Auflösen ist ein ungültiger Aufruf; der rohe git-Text wandert in den Debugtext.</summary>
    private static async Task<Commitzeilen> LeseMitGrundAsync(Auswahl auswahl, Standardeingabe stdin, string arbeitsordner)
    {
        try
        {
            return await LeseRohAsync(auswahl, stdin, arbeitsordner);
        }
        catch (GitNichtGefunden fehler)
        {
            throw Aufruffehler.Fuer(Aufrufgrund.GitNichtGefunden, fehler.Message);
        }
        catch (GitFehler fehler)
        {
            throw Aufruffehler.Fuer(Aufrufgrund.AuswahlNichtAufloesbar, fehler.Message);
        }
    }

    private static async Task<Commitzeilen> LeseRohAsync(Auswahl auswahl, Standardeingabe stdin, string arbeitsordner)
    {
        switch (auswahl.Art)
        {
            case Auswahlart.Einzelcommits:
                return LeseHashesGeprueft(auswahl.Hashes, arbeitsordner);
            case Auswahlart.Bereiche:
                return GitLeser.LeseBereiche(auswahl.Bereiche, arbeitsordner);
            case Auswahlart.Stdin:
                var hashes = await StdinHashes.LesenAsync(stdin.Eingabe, stdin.IstTerminal, StdinFrist);
                return LeseHashesGeprueft(hashes, arbeitsordner);
            default:
                throw new ArgumentOutOfRangeException(nameof(auswahl), auswahl.Art, "unbekannte Auswahlart");
        }
    }

    private static Commitzeilen LeseHashesGeprueft(CommitHashes hashes, string arbeitsordner)
    {
        var commits = GitLeser.Lesen(hashes, arbeitsordner);
        HashpraefixPruefer.PruefeTreffer(hashes, commits);
        return commits;
    }

    private static void Beurteile(Commitzeilen commits, StderrProtokoll protokoll)
    {
        var urteil = Auswahlgrenze.Pruefe(commits.Anzahl);
        switch (urteil)
        {
            case Auswahlurteil.Leer:
                throw Aufruffehler.Fuer(Aufrufgrund.LeereAuswahl, "Die gelesene Auswahl ergab keinen Commit.");
            case Auswahlurteil.Abgelehnt:
                throw new AuswahlFehler(Auswahlgrenze.Meldung(urteil, commits.Anzahl));
            case Auswahlurteil.MitWarnung:
                protokoll.Melde(Protokollstufe.Warnung, Kontext, Auswahlgrenze.Meldung(urteil, commits.Anzahl));
                break;
            case Auswahlurteil.Zulaessig:
                break;
        }
    }
}
