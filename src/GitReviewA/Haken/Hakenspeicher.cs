namespace GitReviewA.Haken;

/// <summary>
/// Haken des Laufs, nur im Arbeitsspeicher. Setzen und Siegeln stehen unter derselben Sperre: was nach dem Siegel kommt, wird abgelehnt
/// und kann nicht still aus dem Ergebnis fallen. Ein Haken nennt den Zielzustand, ein doppeltes Setzen ändert nichts.
/// </summary>
internal sealed class Hakenspeicher
{
    private readonly Lock sperre = new();
    private readonly HashSet<Stelle> abgehakt = [];
    private bool istGesiegelt;

    public bool VersucheZuSetzen(Stelle stelle, bool abgehakt)
    {
        lock (sperre)
        {
            if (istGesiegelt)
            {
                return false;
            }
            if (abgehakt)
            {
                this.abgehakt.Add(stelle);
                return true;
            }
            this.abgehakt.Remove(stelle);
            return true;
        }
    }

    public bool VersucheZuSiegeln()
    {
        lock (sperre)
        {
            var warSchonGesiegelt = istGesiegelt;
            istGesiegelt = true;
            return !warSchonGesiegelt;
        }
    }

    public Haken Schnappschuss()
    {
        lock (sperre)
        {
            return new Haken(abgehakt);
        }
    }
}
