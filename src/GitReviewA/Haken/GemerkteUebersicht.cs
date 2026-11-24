namespace GitReviewA.Haken;

/// <summary>
/// Liest die Übersicht beim ersten Zugriff einmal und hält sie für den Lauf (Commits sind unveränderlich). Ein Fehler wird nicht gemerkt:
/// der nächste Zugriff — etwa nach dem Neuladen der Seite — liest erneut. Nur das Lesen steht unter der Sperre; das Ergebnis wartet nie auf git.
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
                Volatile.Write(ref gemerkt, quelle.Lesen());
            }
            return gemerkt;
        }
    }

    /// <summary>
    /// Für das Ergebnis: liest nie selbst und wartet nicht auf eine laufende Lesung. Ohne gemerkte Übersicht gibt es auch keinen Haken —
    /// ein Haken wird erst nach der Lesung gesetzt.
    /// </summary>
    public Dateiuebersicht GemerktOderLeer()
    {
        var bisherGemerkt = Volatile.Read(ref gemerkt);
        if (bisherGemerkt is null)
        {
            return new Dateiuebersicht([], []);
        }
        return bisherGemerkt;
    }
}
