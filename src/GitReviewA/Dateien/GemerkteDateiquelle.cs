using GitReviewA.Git;

namespace GitReviewA.Dateien;

/// <summary>
/// Merkt sich die zuletzt gelesene Dateiliste je Commit im Speicher des Laufs (nichts wird gespeichert). Die Dateiliste selbst
/// liest immer neu; die Pfadprüfung des Diffs nimmt die gemerkte Liste, damit ein fremder Pfad git nicht erreicht.
/// </summary>
internal sealed class GemerkteDateiquelle(IDateiquelle quelle) : IDateiquelle
{
    private readonly Dictionary<string, Dateiaenderungen> dateienNachHash = new(StringComparer.Ordinal);
    private readonly Lock sperre = new();

    public Dateiaenderungen Lesen(string hash)
    {
        var dateien = quelle.Lesen(hash);
        lock (sperre)
        {
            dateienNachHash[hash] = dateien;
        }
        return dateien;
    }

    public Dateiaenderungen GemerktOderGelesen(string hash)
    {
        lock (sperre)
        {
            var istGemerkt = dateienNachHash.TryGetValue(hash, out var gemerkt);
            if (istGemerkt && gemerkt is not null)
            {
                return gemerkt;
            }
        }
        return Lesen(hash);
    }
}
