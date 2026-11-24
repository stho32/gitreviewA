using GitReviewA.Git;

namespace GitReviewA.Anmerkungen;

/// <summary>Die vollen Hashes der Commits, die der Lauf zeigt.</summary>
internal sealed class CommitAuswahl
{
    private readonly HashSet<string> hashes = new(StringComparer.Ordinal);

    public CommitAuswahl(Commitzeilen commits)
    {
        foreach (var commit in commits)
        {
            hashes.Add(commit.Hash);
        }
    }

    public bool EnthaeltGenau(string hash)
    {
        return hashes.Contains(hash);
    }

    public bool HatHashMitAnfang(string anfang)
    {
        return hashes.Any(hash => hash.StartsWith(anfang, StringComparison.Ordinal));
    }
}
