using GitReviewA.Diff;

namespace GitReviewA.Zusammen;

internal enum ZusammenDiffausgang
{
    Gelesen,
    NichtGefunden,
    NameNichtLesbar,
    NichtLesbar,
}

/// <summary>`Antwort` steht genau dann da, wenn der Ausgang <see cref="ZusammenDiffausgang.Gelesen"/> ist.</summary>
internal sealed record ZusammenDiffergebnis(ZusammenDiffausgang Ausgang, ZusammenDiffAntwort? Antwort)
{
    public static ZusammenDiffergebnis Gelesen(ZusammenDiffAntwort antwort)
    {
        return new ZusammenDiffergebnis(ZusammenDiffausgang.Gelesen, antwort);
    }

    public static readonly ZusammenDiffergebnis NichtGefunden = new(ZusammenDiffausgang.NichtGefunden, null);
    public static readonly ZusammenDiffergebnis NameNichtLesbar = new(ZusammenDiffausgang.NameNichtLesbar, null);
    public static readonly ZusammenDiffergebnis NichtLesbar = new(ZusammenDiffausgang.NichtLesbar, null);
}
