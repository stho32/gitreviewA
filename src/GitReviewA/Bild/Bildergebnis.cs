namespace GitReviewA.Bild;

internal enum Bildausgang
{
    Gelesen,
    KeinBild,
    ZuGross,
    NichtGefunden,
    NameNichtLesbar,
    NichtLesbar,
}

/// <summary>`Antwort` steht genau dann da, wenn der Ausgang <see cref="Bildausgang.Gelesen"/> ist; `Meldung` nur bei <see cref="Bildausgang.ZuGross"/>.</summary>
internal sealed record Bildergebnis(Bildausgang Ausgang, Bildantwort? Antwort, string? Meldung = null)
{
    public static Bildergebnis Gelesen(Bildantwort antwort)
    {
        return new Bildergebnis(Bildausgang.Gelesen, antwort);
    }

    /// <summary>Über der Ausgabegrenze gelesen: kein Bild, nur die Meldung, die die Grenze nennt.</summary>
    public static Bildergebnis ZuGross(long grenze)
    {
        return new Bildergebnis(Bildausgang.ZuGross, null, ZuGrossMeldung(grenze));
    }

    public static string ZuGrossMeldung(long grenze)
    {
        return $"Bild zu groß — die Ausgabe von git überschreitet die Grenze von {grenze} Byte";
    }

    public static readonly Bildergebnis KeinBild = new(Bildausgang.KeinBild, null);
    public static readonly Bildergebnis NichtGefunden = new(Bildausgang.NichtGefunden, null);
    public static readonly Bildergebnis NameNichtLesbar = new(Bildausgang.NameNichtLesbar, null);
    public static readonly Bildergebnis NichtLesbar = new(Bildausgang.NichtLesbar, null);
}
