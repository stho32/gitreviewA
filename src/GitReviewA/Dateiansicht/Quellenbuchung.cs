namespace GitReviewA.Dateiansicht;

/// <summary>
/// Die eine Buchung der gelesenen Bytes (R00043 NFA, Lehre „Grenzen, die Arbeit begrenzen“): je Datei höchstens die Einzelgrenze,
/// zusammen höchstens 32 MiB. Gemessen und gebucht wird am einzigen Leseort; gelesen wird nie mehr als <c>Rest + 1</c> Byte,
/// damit das Überschreiten ohne Weiterlesen feststeht.
/// </summary>
internal sealed class Quellenbuchung
{
    /// <summary>32 MiB für Datenträger- und Commitquellen gemeinsam (PO 2026-11-25, Zeile 204).</summary>
    public static readonly long StandardSumme = 32L * 1024 * 1024;

    public Quellenbuchung(long hoechstsumme = 0)
    {
        Hoechstsumme = hoechstsumme > 0 ? hoechstsumme : StandardSumme;
    }

    public long Hoechstsumme { get; }

    public long Gebucht { get; private set; }

    public long Verbleibend => Math.Max(0, Hoechstsumme - Gebucht);

    /// <summary>So viele Bytes darf der nächste Lesevorgang höchstens aufnehmen: Einzelgrenze und Summe, je + 1 zum Erkennen.</summary>
    public long Lesehoechstmenge(long einzelgrenze)
    {
        return Math.Min(einzelgrenze + 1, Verbleibend + 1);
    }

    /// <summary>Bucht die gelesenen Bytes; <c>false</c>, wenn die Summe danach überschritten ist.</summary>
    public bool Buchen(long bytes)
    {
        Gebucht += bytes;
        return Gebucht <= Hoechstsumme;
    }
}