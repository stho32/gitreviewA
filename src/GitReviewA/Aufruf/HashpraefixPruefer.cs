using GitReviewA.Git;

namespace GitReviewA.Aufruf;

/// <summary>
/// git löst einen Namen vor einem Hash-Präfix auf: ein Tag oder Zweig, der wie das Präfix heißt, lenkt es still auf einen anderen Commit.
/// Deshalb muss jeder gelesene Commit mit einer Eingabe beginnen und jede Eingabe einen gelesenen Commit treffen.
/// </summary>
internal static class HashpraefixPruefer
{
    /// <summary>Der Wortlaut der Mehrdeutigkeit — eine Stelle für Review-Auswahl und Commitquelle (R00046).</summary>
    public const string Mehrdeutigmeldung =
        "Auswahl mehrdeutig: das Hash-Präfix trifft mehrere Commits oder heißt wie ein Tag oder Zweig des Repos, und git würde einen anderen Commit zeigen — bitte den vollen Hash angeben.";

    /// <summary>Ein einzelner aufgelöster Commit: die Eingabe muss ein Präfix des vollen Hashs sein (Lehre #2, R00046).</summary>
    public static bool PraefixPasst(string eingabe, string vollerHash)
    {
        return BeginntMit(vollerHash, eingabe);
    }

    public static void PruefeTreffer(CommitHashes eingaben, Commitzeilen gelesen)
    {
        var gelieferteHashes = GelieferteHashes(gelesen);
        foreach (var hash in gelieferteHashes)
        {
            var hashGehoertZuEinerEingabe = BeginntMitEinemPraefix(hash, eingaben);
            if (!hashGehoertZuEinerEingabe)
            {
                throw new AuswahlFehler(Mehrdeutigmeldung);
            }
        }
        foreach (var eingabe in eingaben)
        {
            var eingabeTrifftEinenCommit = gelieferteHashes.Any(hash => BeginntMit(hash, eingabe));
            if (!eingabeTrifftEinenCommit)
            {
                throw new AuswahlFehler(Mehrdeutigmeldung);
            }
        }
    }

    private static List<string> GelieferteHashes(Commitzeilen gelesen)
    {
        var hashes = new List<string>();
        foreach (var zeile in gelesen)
        {
            hashes.Add(zeile.Hash);
        }
        return hashes;
    }

    private static bool BeginntMitEinemPraefix(string hash, CommitHashes eingaben)
    {
        foreach (var eingabe in eingaben)
        {
            if (BeginntMit(hash, eingabe))
            {
                return true;
            }
        }
        return false;
    }

    private static bool BeginntMit(string hash, string eingabe)
    {
        return hash.StartsWith(eingabe, StringComparison.OrdinalIgnoreCase);
    }
}
