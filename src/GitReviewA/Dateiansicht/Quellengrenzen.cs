namespace GitReviewA.Dateiansicht;

/// <summary>
/// Die Grenzen der Quellenliste (R00045, B4241): höchstens 50 Angaben, zusammen höchstens 32 MiB. Reine Operation; die Zahl
/// wird vor dem Lesen geprüft, die Summe beim Lesen gebucht (<see cref="Quellenbuchung"/>). Die Werte stehen hier einmal.
/// </summary>
internal static class Quellengrenzen
{
    public const int Hoechstzahl = 50;

    /// <summary>32 MiB gemeinsam für Datenträger- und Commitquellen (PO 2026-11-25, Zeile 204).</summary>
    public const long Hoechstsumme = 33_554_432L;

    /// <summary>Der Grund zu vieler Angaben oder <c>null</c>; die Zahl steht im Wortlaut (R00045 Kriterium 3).</summary>
    public static string? Zahlmeldung(int anzahl)
    {
        return anzahl > Hoechstzahl ? $"zu viele Dateien ({anzahl}, höchstens {Hoechstzahl})" : null;
    }

    /// <summary>Ist die Summe der gelesenen Bytes über der Grenze? (genau = in Ordnung, ein Byte mehr = darüber.)</summary>
    public static bool SummeUeberschritten(long summeBytes)
    {
        return summeBytes > Hoechstsumme;
    }
}
