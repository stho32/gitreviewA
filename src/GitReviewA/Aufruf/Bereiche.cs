namespace GitReviewA.Aufruf;

/// <summary>Geprüfte Bereiche der Form <c>&lt;von&gt;..&lt;bis&gt;</c> (siehe <see cref="Bereichspruefer"/>).</summary>
internal sealed class Bereiche
{
    private readonly string[] bereiche;

    public Bereiche(IEnumerable<string> bereiche)
    {
        this.bereiche = bereiche.ToArray();
    }

    public int Anzahl => bereiche.Length;

    public IEnumerator<string> GetEnumerator()
    {
        return ((IEnumerable<string>)bereiche).GetEnumerator();
    }
}
