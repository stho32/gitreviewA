using GitReviewA.Anmerkungen;

namespace GitReviewA.Tests.Hilfen;

internal static class AnmerkungslisteAlsArray
{
    public static Anmerkung[] AlsArray(this Anmerkungsliste anmerkungen)
    {
        var liste = new List<Anmerkung>();
        foreach (var anmerkung in anmerkungen)
        {
            liste.Add(anmerkung);
        }
        return liste.ToArray();
    }
}
