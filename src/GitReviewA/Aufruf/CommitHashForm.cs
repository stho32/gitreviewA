using System.Text.RegularExpressions;

namespace GitReviewA.Aufruf;

internal static partial class CommitHashForm
{
    public const string Beschreibung = "4 bis 64 Hexziffern";

    public static bool IstCommitHash(string text)
    {
        return CommitHashMuster().IsMatch(text);
    }

    [GeneratedRegex(@"^[0-9a-fA-F]{4,64}\z", RegexOptions.CultureInvariant)]
    private static partial Regex CommitHashMuster();
}
