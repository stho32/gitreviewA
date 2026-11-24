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
/// Rohbytes mit Zeilenende lassen sich über stdin nicht an git geben.
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
        var rohbytesMitZeilenende = TraegtZeilenendeInRohbytes(datei);
        if (rohbytesMitZeilenende)
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

    private static bool TraegtZeilenendeInRohbytes(Dateiaenderung datei)
    {
        var rohpfadMitZeilenende = datei.Rohpfad is not null && datei.Rohpfad.EnthaeltZeilenende;
        var rohAlterPfadMitZeilenende = datei.RohAlterPfad is not null && datei.RohAlterPfad.EnthaeltZeilenende;
        return rohpfadMitZeilenende || rohAlterPfadMitZeilenende;
    }
}
