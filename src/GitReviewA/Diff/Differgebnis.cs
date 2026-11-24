namespace GitReviewA.Diff;

internal enum Diffausgang
{
    Gelesen,
    NichtGefunden,
    NichtLesbar,
    NameNichtLesbar,
}

/// <summary>`Antwort` steht genau dann da, wenn der Ausgang <see cref="Diffausgang.Gelesen"/> ist.</summary>
internal sealed record Differgebnis(Diffausgang Ausgang, DiffAntwort? Antwort)
{
    public static Differgebnis Gelesen(DiffAntwort antwort)
    {
        return new Differgebnis(Diffausgang.Gelesen, antwort);
    }

    public static readonly Differgebnis NichtGefunden = new(Diffausgang.NichtGefunden, null);
    public static readonly Differgebnis NichtLesbar = new(Diffausgang.NichtLesbar, null);
    public static readonly Differgebnis NameNichtLesbar = new(Diffausgang.NameNichtLesbar, null);
}
