namespace GitReviewA.Aufruf;

/// <summary>
/// Das gelesene Ergebnis des Aufrufs: entweder ein Review-<see cref="Startauftrag"/> oder ein <see cref="Dateiaufruf"/>.
/// Beide schließen sich aus — ein Lauf ist Review oder Dateiansicht, nie beides (R00043, Pflichtpunkt 5).
/// </summary>
internal sealed record Aufrufergebnis(Startauftrag? Startauftrag, Dateiaufruf? Dateiaufruf, string Fehlermeldung)
{
    public Laufart Laufart => Dateiaufruf is null ? Laufart.Review : Laufart.Dateiansicht;

    public bool IstGueltig => Startauftrag is not null || Dateiaufruf is not null;

    public static Aufrufergebnis Gueltig(Startauftrag startauftrag)
    {
        return new Aufrufergebnis(startauftrag, null, string.Empty);
    }

    public static Aufrufergebnis Gueltig(Dateiaufruf dateiaufruf)
    {
        return new Aufrufergebnis(null, dateiaufruf, string.Empty);
    }

    public static Aufrufergebnis Ungueltig(string fehlermeldung)
    {
        return new Aufrufergebnis(null, null, fehlermeldung);
    }
}