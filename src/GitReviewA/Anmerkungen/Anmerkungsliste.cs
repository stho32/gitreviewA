namespace GitReviewA.Anmerkungen;

internal sealed class Anmerkungsliste
{
    private readonly Anmerkung[] anmerkungen;

    public Anmerkungsliste(IEnumerable<Anmerkung> anmerkungen)
    {
        this.anmerkungen = anmerkungen.ToArray();
    }

    public int Anzahl => anmerkungen.Length;

    public Anmerkung this[int index] => anmerkungen[index];

    public IEnumerator<Anmerkung> GetEnumerator()
    {
        return ((IEnumerable<Anmerkung>)anmerkungen).GetEnumerator();
    }
}
