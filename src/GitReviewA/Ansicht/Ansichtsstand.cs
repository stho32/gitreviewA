using GitReviewA.Haken;

namespace GitReviewA.Ansicht;

/// <summary>
/// Der Ansichtsstand des Laufs: die Stellen, deren Diff-Bereich der Mensch einmal gesehen hat (R00041). Eine Stelle ist
/// Commit und Datei wie beim Haken — derselbe Schlüssel. Nur im Arbeitsspeicher, nichts wird gespeichert; der Stand überlebt
/// das Neuladen der Seite, weil er beim Server liegt.
/// </summary>
internal sealed class Ansichtsstand
{
    private readonly Lock sperre = new();
    private readonly HashSet<Stelle> angesehen = [];

    public void Markiere(IEnumerable<Stelle> stellen)
    {
        lock (sperre)
        {
            foreach (var stelle in stellen)
            {
                angesehen.Add(stelle);
            }
        }
    }

    public bool Enthaelt(Stelle stelle)
    {
        lock (sperre)
        {
            return angesehen.Contains(stelle);
        }
    }

    public int Anzahl
    {
        get
        {
            lock (sperre)
            {
                return angesehen.Count;
            }
        }
    }

    /// <summary>Die Stellen des Stands in fester Reihenfolge (Commit, dann Datei) — derselbe Stand ergibt dieselbe Antwort.</summary>
    public IReadOnlyList<Stelle> Angesehen()
    {
        lock (sperre)
        {
            var sortiert = angesehen
                .OrderBy(stelle => stelle.Commit, StringComparer.Ordinal)
                .ThenBy(stelle => stelle.Pfad, StringComparer.Ordinal);
            return sortiert.ToArray();
        }
    }
}
