namespace GitReviewA.Git;

internal static class GitLogAusgabe
{
    public const string Feldtrenner = "\u001f";

    public static Commitzeilen Zerlegen(string ausgabe)
    {
        var zeilen = ausgabe.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        return new Commitzeilen(zeilen.Select(ZerlegeZeile));
    }

    private static Commitzeile ZerlegeZeile(string zeile)
    {
        var felder = zeile.Split(Feldtrenner, 2);
        var betreffFehlt = felder.Length < 2;
        if (betreffFehlt)
        {
            throw new GitFehler($"unerwartete Ausgabe von git log (Länge {zeile.Length}, ohne Feldtrenner)");
        }
        return new Commitzeile(felder[0], felder[1]);
    }
}
