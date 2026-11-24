namespace GitReviewA.Diff;

internal enum Diffausgang
{
    Gelesen,
    ZuGross,
    NichtGefunden,
    NichtLesbar,
    NameNichtLesbar,
}

/// <summary>`Antwort` steht genau dann da, wenn der Ausgang <see cref="Diffausgang.Gelesen"/> ist; `Meldung` nur bei <see cref="Diffausgang.ZuGross"/>.</summary>
internal sealed record Differgebnis(Diffausgang Ausgang, DiffAntwort? Antwort, string? Meldung = null)
{
    public static Differgebnis Gelesen(DiffAntwort antwort)
    {
        return new Differgebnis(Diffausgang.Gelesen, antwort);
    }

    /// <summary>Über der Ausgabegrenze gelesen: kein Patch, nur die Meldung, die die Grenze nennt.</summary>
    public static Differgebnis ZuGross(long grenze)
    {
        return new Differgebnis(Diffausgang.ZuGross, null, ZuGrossMeldung(grenze));
    }

    public static string ZuGrossMeldung(long grenze)
    {
        return $"Diff zu groß — die Ausgabe von git überschreitet die Grenze von {grenze} Byte";
    }

    public static readonly Differgebnis NichtGefunden = new(Diffausgang.NichtGefunden, null);
    public static readonly Differgebnis NichtLesbar = new(Diffausgang.NichtLesbar, null);
    public static readonly Differgebnis NameNichtLesbar = new(Diffausgang.NameNichtLesbar, null);
}
