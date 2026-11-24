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

    /// <summary>
    /// Die Netto-Antwort: ein Patch gegen den Elternstand des ältesten Commits, als netto gekennzeichnet, mit den Commits der Kette.
    /// Eine Binärdatei kommt mit Grund und ohne Byte-Inhalt (wie R00004).
    /// </summary>
    public static ZusammenDiffAntwort Netto(Dateiaenderung datei, string patchText, string? binaerGrund, IEnumerable<string> commits)
    {
        var art = ArtVon(datei);
        if (art == ArtBinaer)
        {
            return new ZusammenDiffAntwort(datei.Pfad, datei.Status, datei.AlterPfad, true, commits.ToArray(), ArtBinaer, binaerGrund, null, []);
        }
        return new ZusammenDiffAntwort(datei.Pfad, datei.Status, datei.AlterPfad, true, commits.ToArray(), art, null, PatchAbErstemHunk(patchText), []);
    }

    /// <summary>
    /// Ohne lückenlose Kette: je Stelle ein Abschnitt in der Reihenfolge des Aufrufs, jeder mit seinem Commit; die Art nennt den
    /// ganzen Satz (binär, wenn jede Stelle binär ist).
    /// </summary>
    public static ZusammenDiffAntwort Abschnitte(Dateiaenderung datei, IEnumerable<Diffabschnitt> abschnitte)
    {
        var liste = abschnitte.ToArray();
        var alleBinaer = liste.Length > 0 && liste.All(abschnitt => abschnitt.Art == ArtBinaer);
        var grund = alleBinaer ? liste[0].Grund : null;
        return new ZusammenDiffAntwort(datei.Pfad, datei.Status, datei.AlterPfad, false, [], alleBinaer ? ArtBinaer : ArtText, grund, null, liste);
    }
}
