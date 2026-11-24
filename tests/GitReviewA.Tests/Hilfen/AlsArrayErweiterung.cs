using GitReviewA.Aufruf;
using GitReviewA.Git;

namespace GitReviewA.Tests.Hilfen;

internal static class AlsArrayErweiterung
{
    public static string[] AlsArray(this CommitHashes hashes)
    {
        var liste = new List<string>();
        foreach (var hash in hashes)
        {
            liste.Add(hash);
        }
        return liste.ToArray();
    }

    public static Commitzeile[] AlsArray(this Commitzeilen zeilen)
    {
        var liste = new List<Commitzeile>();
        foreach (var zeile in zeilen)
        {
            liste.Add(zeile);
        }
        return liste.ToArray();
    }
}
