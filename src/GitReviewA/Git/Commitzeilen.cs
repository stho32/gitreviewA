namespace GitReviewA.Git;

internal sealed class Commitzeilen
{
    private readonly Commitzeile[] zeilen;

    public Commitzeilen(IEnumerable<Commitzeile> zeilen)
    {
        this.zeilen = zeilen.ToArray();
    }

    public int Anzahl => zeilen.Length;

    public Commitzeile this[int index] => zeilen[index];

    public IEnumerator<Commitzeile> GetEnumerator()
    {
        return ((IEnumerable<Commitzeile>)zeilen).GetEnumerator();
    }
}
