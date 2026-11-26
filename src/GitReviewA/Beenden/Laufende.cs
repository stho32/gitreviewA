namespace GitReviewA.Beenden;

/// <summary>
/// Der eine Einmal-Schalter für „Beenden“ und „Abbrechen“ (R00050): der erste vollständig angenommene Versuch gewinnt und
/// legt den Endzustand des Laufs fest; jeder weitere Versuch ändert nichts. „Beenden“ und der Abbruchset des Signals fragen
/// ihn, <see cref="AbbruchEntscheidung"/> liest ihn — es gibt keinen zweiten Schalter.
/// </summary>
internal sealed class Laufende
{
    private readonly Lock sperre = new();
    private Laufentscheidung zustand = Laufentscheidung.Laeuft;

    public Laufentscheidung Zustand
    {
        get
        {
            lock (sperre)
            {
                return zustand;
            }
        }
    }

    public Laufversuch Versuche(Laufentscheidung gewuenscht)
    {
        if (gewuenscht == Laufentscheidung.Laeuft)
        {
            throw new ArgumentOutOfRangeException(nameof(gewuenscht), "Laeuft ist keine Entscheidung");
        }
        lock (sperre)
        {
            if (zustand == Laufentscheidung.Laeuft)
            {
                zustand = gewuenscht;
                return new Laufversuch(Angenommen: true, zustand);
            }
            return new Laufversuch(Angenommen: false, zustand);
        }
    }
}