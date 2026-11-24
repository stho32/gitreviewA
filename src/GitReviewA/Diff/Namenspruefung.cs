using GitReviewA.Fremdtext;
using GitReviewA.Git;

namespace GitReviewA.Diff;

internal enum Namensfall
{
    Lesbar,
    NichtGefunden,
    NichtEindeutig,
    NichtUebergebbar,
}

/// <summary>`Datei` steht genau dann da, wenn der Fall <see cref="Namensfall.Lesbar"/> ist.</summary>
internal sealed record Namenstreffer(Namensfall Fall, Dateiaenderung? Datei);

/// <summary>
/// Welche Datei der Dateiliste ein angefragter Name meint: genau gleich, Groß- und Kleinschreibung beachtet. Tragen zwei Dateien denselben
/// angezeigten Namen (wörtlich `f⟨0xFF⟩.txt` neben `f\xFF.txt`), ist keine gemeint — sonst zeigte eine Zeile den Patch der anderen.
/// Trägt eine Datei Rohbytes, gehen beide Namen zeilenweise über stdin an git: dort trennt git an LF und schneidet CR ab,
/// ein Zeilenende in irgendeinem der beiden Namen machte daraus andere Pfade — und den Patch einer anderen Datei.
/// </summary>
internal static class Namenspruefung
{
    public static Namenstreffer Pruefe(Dateiaenderungen dateienDesCommits, string pfad)
    {
        var treffer = DateienMitPfad(dateienDesCommits, pfad);
        var keinTreffer = treffer.Count == 0;
        if (keinTreffer)
        {
            return new Namenstreffer(Namensfall.NichtGefunden, null);
        }
        var mehrereTreffer = treffer.Count > 1;
        if (mehrereTreffer)
        {
            return new Namenstreffer(Namensfall.NichtEindeutig, null);
        }
        var datei = treffer[0];
        var gehtMitZeilenendeUeberStdin = GehtUeberStdin(datei) && TraegtZeilenende(datei);
        if (gehtMitZeilenendeUeberStdin)
        {
            return new Namenstreffer(Namensfall.NichtUebergebbar, null);
        }
        return new Namenstreffer(Namensfall.Lesbar, datei);
    }

    private static List<Dateiaenderung> DateienMitPfad(Dateiaenderungen dateienDesCommits, string pfad)
    {
        var treffer = new List<Dateiaenderung>();
        foreach (var datei in dateienDesCommits)
        {
            var istGesuchterPfad = string.Equals(datei.Pfad, pfad, StringComparison.Ordinal);
            if (istGesuchterPfad)
            {
                treffer.Add(datei);
            }
        }
        return treffer;
    }

    private static bool GehtUeberStdin(Dateiaenderung datei)
    {
        return datei.Rohpfad is not null || datei.RohAlterPfad is not null;
    }

    /// <summary>
    /// Ob einer der beiden Namen (neu und alt, angezeigt oder als Rohbytes) LF oder CR trägt. `git` trennt eine Zeile an LF und
    /// schneidet CR ab: ein Zeilenende im Namen machte daraus andere Pfade — und den Patch einer anderen Datei.
    /// </summary>
    public static bool TraegtZeilenende(Dateiaenderung datei)
    {
        var pfadMitZeilenende = NameTraegtZeilenende(datei.Pfad, datei.Rohpfad);
        var alterPfadMitZeilenende = datei.AlterPfad is not null && NameTraegtZeilenende(datei.AlterPfad, datei.RohAlterPfad);
        return pfadMitZeilenende || alterPfadMitZeilenende;
    }

    private static bool NameTraegtZeilenende(string name, Rohname? rohname)
    {
        var angezeigterNameMitZeilenende = name.Contains('\n') || name.Contains('\r');
        var rohbytesMitZeilenende = rohname is not null && rohname.EnthaeltZeilenende;
        return angezeigterNameMitZeilenende || rohbytesMitZeilenende;
    }
}
