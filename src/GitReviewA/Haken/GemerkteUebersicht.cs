namespace GitReviewA.Haken;

/// <summary>
/// Liest die Übersicht beim ersten Zugriff einmal und hält sie für den Lauf (Commits sind unveränderlich). Ein Fehler wird nicht gemerkt:
/// der nächste Zugriff — etwa nach dem Neuladen der Seite — liest erneut.
/// </summary>
internal sealed class GemerkteUebersicht(IUebersichtsquelle quelle)
{
    private readonly Lock sperre = new();
    private Dateiuebersicht? gemerkt;

    public Dateiuebersicht Lesen()
    {
        lock (sperre)
        {
            if (gemerkt is null)
            {
                gemerkt = quelle.Lesen();
            }
            return gemerkt;
        }
    }

    /// <summary>Für das Ergebnis: liest nie selbst. Ohne gelesene Übersicht gibt es auch keinen Haken.</summary>
    public Dateiuebersicht GemerktOderLeer()
    {
        lock (sperre)
        {
            if (gemerkt is null)
            {
                return new Dateiuebersicht([], []);
            }
            return gemerkt;
        }
    }
}
