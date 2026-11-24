using System.Diagnostics.CodeAnalysis;

namespace GitReviewA.Anmerkungen;

internal sealed record Pruefergebnis(GepruefteAnmerkung? Anmerkung, string Ablehnungsgrund)
{
    [MemberNotNullWhen(true, nameof(Anmerkung))]
    public bool IstGueltig => Anmerkung is not null;

    public static Pruefergebnis Gueltig(GepruefteAnmerkung anmerkung)
    {
        return new Pruefergebnis(anmerkung, string.Empty);
    }

    public static Pruefergebnis Abgelehnt(string ablehnungsgrund)
    {
        return new Pruefergebnis(null, ablehnungsgrund);
    }
}
