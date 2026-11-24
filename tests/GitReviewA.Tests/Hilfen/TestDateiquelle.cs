using GitReviewA.Dateien;
using GitReviewA.Git;

namespace GitReviewA.Tests.Hilfen;

/// <summary>Liefert feste Dateien je Hash, zählt die Lesevorgänge; ein Hash in <c>scheitertFuer</c> wirft wie git bei fehlendem Objekt.</summary>
internal sealed class TestDateiquelle(Dictionary<string, Dateiaenderungen> dateienJeHash, string? scheitertFuer = null) : IDateiquelle
{
    private int lesevorgaenge;

    public int Lesevorgaenge => lesevorgaenge;

    public static TestDateiquelle Leer()
    {
        return new TestDateiquelle([]);
    }

    public Dateiaenderungen Lesen(string hash)
    {
        Interlocked.Increment(ref lesevorgaenge);
        var scheitert = hash == scheitertFuer;
        if (scheitert)
        {
            throw new GitFehler($"git show {hash} endete mit 128: fatal: bad object {hash}");
        }
        var bekannt = dateienJeHash.TryGetValue(hash, out var dateien);
        if (!bekannt || dateien is null)
        {
            return new Dateiaenderungen([]);
        }
        return dateien;
    }
}
