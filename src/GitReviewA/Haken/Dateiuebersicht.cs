namespace GitReviewA.Haken;

/// <summary>
/// Alle Stellen der Auswahl: Commits in der Reihenfolge der Auswahl, je Commit die Dateien in der Reihenfolge von git.
/// git nennt je Commit jeden Pfad einmal; nennt die Übersicht eine Stelle mehrfach, haben verschiedene Dateien denselben Namen
/// (ein Doppelgänger einer Bytemarke) — eine solche Stelle ist nicht eindeutig und lässt sich nicht abhaken.
/// </summary>
internal sealed class Dateiuebersicht
{
    private readonly Stelle[] stellen;
    private readonly HashSet<Stelle> stellenmenge;
    private readonly HashSet<Stelle> mehrdeutigeStellen;
    private readonly HashSet<string> commits;

    public Dateiuebersicht(IEnumerable<string> commits, IEnumerable<Stelle> stellen)
    {
        this.commits = new HashSet<string>(commits, StringComparer.Ordinal);
        this.stellen = stellen.ToArray();
        stellenmenge = [];
        mehrdeutigeStellen = [];
        foreach (var stelle in this.stellen)
        {
            var istSchonGenannt = !stellenmenge.Add(stelle);
            if (istSchonGenannt)
            {
                mehrdeutigeStellen.Add(stelle);
            }
        }
    }

    public int Anzahl => stellen.Length;

    public bool Enthaelt(Stelle stelle)
    {
        return stellenmenge.Contains(stelle);
    }

    public bool IstEindeutig(Stelle stelle)
    {
        return !mehrdeutigeStellen.Contains(stelle);
    }

    public bool EnthaeltCommit(string hash)
    {
        return commits.Contains(hash);
    }

    public IEnumerator<Stelle> GetEnumerator()
    {
        return ((IEnumerable<Stelle>)stellen).GetEnumerator();
    }
}
