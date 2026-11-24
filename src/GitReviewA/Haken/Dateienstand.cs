namespace GitReviewA.Haken;

/// <summary>Jede Stelle der Übersicht mit ihrem Haken, in der Reihenfolge der Übersicht.</summary>
internal sealed class Dateienstand
{
    private readonly Stellenstand[] stellen;

    public Dateienstand(IEnumerable<Stellenstand> stellen)
    {
        this.stellen = stellen.ToArray();
        Abgehakt = this.stellen.Count(stelle => stelle.Abgehakt);
    }

    public int Gesamt => stellen.Length;

    public int Abgehakt { get; }

    public static Dateienstand Aus(Dateiuebersicht uebersicht, Haken haken)
    {
        var stellen = new List<Stellenstand>(uebersicht.Anzahl);
        foreach (var stelle in uebersicht)
        {
            stellen.Add(new Stellenstand(stelle.Commit, stelle.Pfad, haken.IstAbgehakt(stelle)));
        }
        return new Dateienstand(stellen);
    }

    public IEnumerator<Stellenstand> GetEnumerator()
    {
        return ((IEnumerable<Stellenstand>)stellen).GetEnumerator();
    }
}
