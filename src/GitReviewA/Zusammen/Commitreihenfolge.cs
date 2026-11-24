using System.Globalization;
using GitReviewA.Aufruf;
using GitReviewA.Git;

namespace GitReviewA.Zusammen;

/// <summary>
/// Die Reihenfolge der Commits einer Auswahl, jüngster zuerst: bei lückenloser Kette deren Ende (eindeutig), ohne Kette das Autordatum
/// (bei gleichem Datum bleibt die Aufrufreihenfolge stehen). Bestimmt den zuständigen Commit — ohne Kette nur ein Hinweisfeld.
/// </summary>
internal static class Commitreihenfolge
{
    public static CommitHashes JuengsteZuerst(Kette kette, Commitzeilen commits)
    {
        var folge = new List<string>();
        foreach (var hash in kette.Reihenfolge)
        {
            folge.Add(hash);
        }
        if (kette.Lueckenlos)
        {
            folge.Reverse();
            return new CommitHashes(folge);
        }
        var zeitNachHash = ZeitNachHash(commits);
        var nachDatum = folge.OrderByDescending(hash => zeitNachHash.GetValueOrDefault(hash, DateTimeOffset.MinValue));
        return new CommitHashes(nachDatum);
    }

    private static Dictionary<string, DateTimeOffset> ZeitNachHash(Commitzeilen commits)
    {
        var zeiten = new Dictionary<string, DateTimeOffset>(StringComparer.Ordinal);
        foreach (var commit in commits)
        {
            if (DateTimeOffset.TryParse(commit.Datum, CultureInfo.InvariantCulture, DateTimeStyles.None, out var zeit))
            {
                zeiten[commit.Hash] = zeit;
            }
        }
        return zeiten;
    }
}
