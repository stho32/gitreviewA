namespace GitReviewA.Aufruf;

/// <summary>Geprüfte Ausblendmuster aus <c>--ignore</c> (R00025) in Reihenfolge des Aufrufs.</summary>
internal sealed class Musterliste
{
    private readonly string[] muster;

    public Musterliste(IEnumerable<string> muster)
    {
        this.muster = muster.ToArray();
    }

    public int Anzahl => muster.Length;

    public string this[int index] => muster[index];

    public IEnumerator<string> GetEnumerator()
    {
        return ((IEnumerable<string>)muster).GetEnumerator();
    }
}
