using GitReviewA.Git;
using GitReviewA.Protokoll;

namespace GitReviewA.Aufruf;

internal static class CommitsDerAuswahl
{
    private const string Kontext = "Auswahl";
    private static readonly TimeSpan StdinFrist = TimeSpan.FromSeconds(10);

    /// <summary>
    /// stdin wird vor jedem git-Aufruf gelesen und geprüft: eine ungültige Zeile erreicht git nie (R00006).
    /// Danach ist eine stdin-Auswahl eine Einzelcommit-Auswahl in Eingabereihenfolge.
    /// </summary>
    public static async Task<Auswahl> VorbereitenAsync(Auswahl auswahl, Standardeingabe stdin)
    {
        var istUeberStdin = auswahl.Art == Auswahlart.Stdin;
        if (!istUeberStdin)
        {
            return auswahl;
        }
        var hashes = await StdinHashes.LesenAsync(stdin.Eingabe, stdin.IstTerminal, StdinFrist);
        return Auswahl.AusEinzelcommits(hashes);
    }

    public static Commitzeilen Lesen(Auswahl auswahl, string arbeitsordner, StderrProtokoll protokoll)
    {
        var commits = LeseMitGrund(auswahl, arbeitsordner);
        Beurteile(commits, protokoll);
        return commits;
    }

    /// <summary>Ein gescheitertes Auflösen ist ein ungültiger Aufruf; der rohe git-Text wandert in den Debugtext.</summary>
    private static Commitzeilen LeseMitGrund(Auswahl auswahl, string arbeitsordner)
    {
        try
        {
            return LeseRoh(auswahl, arbeitsordner);
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

    private static Commitzeilen LeseRoh(Auswahl auswahl, string arbeitsordner)
    {
        switch (auswahl.Art)
        {
            case Auswahlart.Einzelcommits:
                return LeseHashesGeprueft(auswahl.Hashes, arbeitsordner);
            case Auswahlart.Bereiche:
                return GitLeser.LeseBereiche(auswahl.Bereiche, arbeitsordner);
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
