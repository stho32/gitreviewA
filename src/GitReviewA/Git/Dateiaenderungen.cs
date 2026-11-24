namespace GitReviewA.Git;

internal sealed class Dateiaenderungen
{
    private readonly Dateiaenderung[] aenderungen;

    public Dateiaenderungen(IEnumerable<Dateiaenderung> aenderungen)
    {
        this.aenderungen = aenderungen.ToArray();
    }

    public int Anzahl => aenderungen.Length;

    public Dateiaenderung this[int index] => aenderungen[index];

    public IEnumerator<Dateiaenderung> GetEnumerator()
    {
        return ((IEnumerable<Dateiaenderung>)aenderungen).GetEnumerator();
    }
}
