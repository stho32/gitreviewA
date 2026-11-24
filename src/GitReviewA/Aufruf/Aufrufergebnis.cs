using System.Diagnostics.CodeAnalysis;

namespace GitReviewA.Aufruf;

internal sealed record Aufrufergebnis(Startauftrag? Startauftrag, string Fehlermeldung)
{
    [MemberNotNullWhen(true, nameof(Startauftrag))]
    public bool IstGueltig => Startauftrag is not null;

    public static Aufrufergebnis Gueltig(Startauftrag startauftrag)
    {
        return new Aufrufergebnis(startauftrag, string.Empty);
    }

    public static Aufrufergebnis Ungueltig(string fehlermeldung)
    {
        return new Aufrufergebnis(null, fehlermeldung);
    }
}
