using GitReviewA.Git;
using GitReviewA.Haken;

namespace GitReviewA.Tests.Hilfen;

/// <summary>Feste Übersicht; <see cref="Scheiternd"/> wirft bei jedem Lesen wie git bei fehlendem Objekt.</summary>
internal sealed class TestUebersichtsquelle(Dateiuebersicht? uebersicht) : IUebersichtsquelle
{
    public static TestUebersichtsquelle Leer()
    {
        return new TestUebersichtsquelle(new Dateiuebersicht([], []));
    }

    public static TestUebersichtsquelle Mit(string hash, params string[] pfade)
    {
        return new TestUebersichtsquelle(new Dateiuebersicht([hash], pfade.Select(pfad => new Stelle(hash, pfad))));
    }

    public static TestUebersichtsquelle Scheiternd()
    {
        return new TestUebersichtsquelle(null);
    }

    public Dateiuebersicht Lesen()
    {
        if (uebersicht is null)
        {
            throw new GitFehler("git log (Übersicht von 1 Commits) endete mit 128: fatal: bad object");
        }
        return uebersicht;
    }
}
