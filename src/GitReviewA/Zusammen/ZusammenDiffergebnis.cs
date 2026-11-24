using GitReviewA.Diff;

namespace GitReviewA.Zusammen;

internal enum ZusammenDiffausgang
{
    Gelesen,
    ZuGross,
    NichtGefunden,
    NameNichtLesbar,
    NichtLesbar,
}

/// <summary>`Antwort` steht genau dann da, wenn der Ausgang <see cref="ZusammenDiffausgang.Gelesen"/> ist; `Meldung` nur bei <see cref="ZusammenDiffausgang.ZuGross"/>.</summary>
internal sealed record ZusammenDiffergebnis(ZusammenDiffausgang Ausgang, ZusammenDiffAntwort? Antwort, string? Meldung = null)
{
    public static ZusammenDiffergebnis Gelesen(ZusammenDiffAntwort antwort)
    {
        return new ZusammenDiffergebnis(ZusammenDiffausgang.Gelesen, antwort);
    }

    /// <summary>Über der Ausgabegrenze gelesen: kein Patch, nur die Meldung, die die Grenze nennt (wie R00017).</summary>
    public static ZusammenDiffergebnis ZuGross(long grenze)
    {
        return new ZusammenDiffergebnis(ZusammenDiffausgang.ZuGross, null, Differgebnis.ZuGrossMeldung(grenze));
    }

    public static readonly ZusammenDiffergebnis NichtGefunden = new(ZusammenDiffausgang.NichtGefunden, null);
    public static readonly ZusammenDiffergebnis NameNichtLesbar = new(ZusammenDiffausgang.NameNichtLesbar, null);
    public static readonly ZusammenDiffergebnis NichtLesbar = new(ZusammenDiffausgang.NichtLesbar, null);
}
