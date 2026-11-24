using GitReviewA.Aufruf;

namespace GitReviewA.Tests.Hilfen;

internal static class CommitHashesErweiterung
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
}
