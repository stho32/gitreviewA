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

    public static Commitzeilen Lesen(Auswahl auswahl, string arbeitsordner, StderrProtokoll protokoll, Ausgabegrenze? grenze = null)
    {
        var commits = LeseMitGrund(auswahl, arbeitsordner, grenze);
        Beurteile(commits, protokoll);
        return commits;
    }

    /// <summary>
    /// Ein gescheitertes Auflösen ist ein ungültiger Aufruf; der rohe git-Text wandert in den Debugtext.
    /// Zu große Angaben sind ein **eigener** Ausgang und werden vor <see cref="GitFehler"/> gefangen: nie „nicht auflösbar“ (Kriterium 4).
    /// </summary>
    private static Commitzeilen LeseMitGrund(Auswahl auswahl, string arbeitsordner, Ausgabegrenze? grenze)
    {
        try
        {
            return LeseRoh(auswahl, arbeitsordner, grenze);
        }
        catch (GitNichtGefunden fehler)
        {
            throw Aufruffehler.Fuer(Aufrufgrund.GitNichtGefunden, fehler.Message);
        }
        catch (GitZuGross zuGross)
        {
            throw Aufruffehler.FuerCommitAngabenZuGross(zuGross.Grenze);
        }
        catch (GitFehler fehler)
        {
            var nichtAufloesbar = NichtAufloesbareHashes(auswahl, arbeitsordner);
            throw Aufruffehler.FuerAuswahlNichtAufloesbar(nichtAufloesbar, auswahl.Hashes, fehler.Message);
        }
    }

    private static CommitHashes NichtAufloesbareHashes(Auswahl auswahl, string arbeitsordner)
    {
        if (auswahl.Art != Auswahlart.Einzelcommits)
        {
            return new CommitHashes([]);
        }

        return GitLeser.NichtAufloesbareHashes(auswahl.Hashes, arbeitsordner);
    }

    private static Commitzeilen LeseRoh(Auswahl auswahl, string arbeitsordner, Ausgabegrenze? grenze)
    {
        switch (auswahl.Art)
        {
            case Auswahlart.Einzelcommits:
                return LeseHashesGeprueft(auswahl.Hashes, arbeitsordner, grenze);
            case Auswahlart.Bereiche:
                return GitLeser.LeseBereiche(auswahl.Bereiche, arbeitsordner, grenze);
            default:
                throw new ArgumentOutOfRangeException(nameof(auswahl), auswahl.Art, "unbekannte Auswahlart");
        }
    }

    private static Commitzeilen LeseHashesGeprueft(CommitHashes hashes, string arbeitsordner, Ausgabegrenze? grenze)
    {
        var commits = GitLeser.Lesen(hashes, arbeitsordner, grenze);
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
            default:
                throw new ArgumentOutOfRangeException(nameof(urteil), urteil, "Unbekanntes Auswahlurteil.");
        }
    }
}
