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
        return new TestUebersichtsquelle(new Dateiuebersicht([hash], pfade.Select(pfad => new Uebersichtsstelle(new Stelle(hash, pfad), string.Empty))));
    }

    /// <summary>Eine gesperrte Stelle mit <paramref name="sperrgrund"/>, danach eine lesbare.</summary>
    public static TestUebersichtsquelle MitSperre(string hash, string gesperrterPfad, string sperrgrund, string lesbarerPfad)
    {
        var stellen = new[] { new Uebersichtsstelle(new Stelle(hash, gesperrterPfad), sperrgrund), new Uebersichtsstelle(new Stelle(hash, lesbarerPfad), string.Empty) };
        return new TestUebersichtsquelle(new Dateiuebersicht([hash], stellen));
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
