using GitReviewA.Git;

namespace GitReviewA.Diff;

/// <summary>Die Art einer Datei steht schon in der Dateiliste; den Patch liefert git, ohne seinen Dateikopf (der Pfad steht über dem Diff).</summary>
internal static class Diffaufbereitung
{
    public const string ArtText = "text";
    public const string ArtBinaer = "binaer";
    public const string ArtLeer = "leer";
    public const string GrundNullbytes = "nullbytes";
    public const string GrundAttribut = "attribut";

    private const string AttributUnbestimmt = "unspecified";
    private const string AttributGesetzt = "set";

    private const string HunkKopf = "@@ ";
    private const string HunkKopfAmZeilenanfang = "\n@@ ";

    public static string ArtVon(Dateiaenderung datei)
    {
        var gitZaehltKeineZeilen = datei.Plus is null || datei.Minus is null;
        if (gitZaehltKeineZeilen)
        {
            return ArtBinaer;
        }
        var ohneZeilenaenderung = datei.Plus == 0 && datei.Minus == 0;
        if (ohneZeilenaenderung)
        {
            return ArtLeer;
        }
        return ArtText;
    }

    /// <summary>
    /// Warum git eine Datei als binär einstuft: ein `diff`-Attribut, das sich nicht abschalten lässt (`.git/info/attributes`: `-diff`, `binary`
    /// oder ein Treiber mit `binary=true`), sonst Null-Bytes in den ersten 8000 Byte.
    /// </summary>
    public static string BinaerGrundAus(string diffAttribut)
    {
        var ohneEigenesAttribut = diffAttribut == AttributUnbestimmt || diffAttribut == AttributGesetzt;
        if (ohneEigenesAttribut)
        {
            return GrundNullbytes;
        }
        return GrundAttribut;
    }

    public static string PatchAbErstemHunk(string ausgabe)
    {
        var beginntMitHunk = ausgabe.StartsWith(HunkKopf, StringComparison.Ordinal);
        if (beginntMitHunk)
        {
            return ausgabe;
        }
        var stelle = ausgabe.IndexOf(HunkKopfAmZeilenanfang, StringComparison.Ordinal);
        var ohneHunk = stelle < 0;
        if (ohneHunk)
        {
            return "";
        }
        return ausgabe[(stelle + 1)..];
    }
}
