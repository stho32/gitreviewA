using GitReviewA.Git;
using GitReviewA.Protokoll;

namespace GitReviewA.Aufruf;

internal static class CommitsDerAuswahl
{
    private const string Kontext = "Auswahl";
    private static readonly TimeSpan StdinFrist = TimeSpan.FromSeconds(10);

    public static async Task<Commitzeilen> LesenAsync(Auswahl auswahl, Standardeingabe stdin, string arbeitsordner, StderrProtokoll protokoll)
    {
        var commits = await LeseCommitsAsync(auswahl, stdin, arbeitsordner);
        PruefeGrenze(commits, protokoll);
        return commits;
    }

    private static async Task<Commitzeilen> LeseCommitsAsync(Auswahl auswahl, Standardeingabe stdin, string arbeitsordner)
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

    private static void PruefeGrenze(Commitzeilen commits, StderrProtokoll protokoll)
    {
        var urteil = Auswahlgrenze.Pruefe(commits.Anzahl);
        if (urteil == Auswahlurteil.Abgelehnt)
        {
            throw new AuswahlFehler(Auswahlgrenze.Ablehnungsmeldung());
        }
        if (urteil == Auswahlurteil.MitWarnung)
        {
            protokoll.Melde(Protokollstufe.Warnung, Kontext, Auswahlgrenze.Warnmeldung(commits.Anzahl));
        }
    }
}
