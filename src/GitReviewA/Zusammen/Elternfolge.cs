namespace GitReviewA.Zusammen;

/// <summary>
/// Je Commit der Auswahl sein erster Eltern-Hash, in Auswahlreihenfolge — gelesen mit einem Aufruf
/// `git log --no-walk=unsorted --format=%H%x1f%P`. Ein Merge trägt nur seinen ersten Elternteil.
/// </summary>
internal sealed class Elternfolge
{
    private readonly Elternzeile[] zeilen;

    public Elternfolge(IEnumerable<Elternzeile> zeilen)
    {
        this.zeilen = zeilen.ToArray();
    }

    public int Anzahl => zeilen.Length;

    public Elternzeile this[int index] => zeilen[index];

    public IEnumerator<Elternzeile> GetEnumerator()
    {
        return ((IEnumerable<Elternzeile>)zeilen).GetEnumerator();
    }
}
