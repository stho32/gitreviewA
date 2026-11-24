namespace GitReviewA.Haken;

/// <summary>Die abgehakten Stellen eines Augenblicks.</summary>
internal sealed class Haken
{
    private readonly HashSet<Stelle> abgehakt;

    public Haken(IEnumerable<Stelle> abgehakt)
    {
        this.abgehakt = [.. abgehakt];
    }

    public int Anzahl => abgehakt.Count;

    public bool IstAbgehakt(Stelle stelle)
    {
        return abgehakt.Contains(stelle);
    }
}
