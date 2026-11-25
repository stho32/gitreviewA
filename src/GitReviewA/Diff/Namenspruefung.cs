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
/// Welche Datei der Dateiliste ein angefragter Name meint: verglichen wird der **angezeigte** Name (Rohbytes und unsichtbare oder
/// richtungsändernde Zeichen als Marke, wie das Ergebnis sie zeigt), Groß- und Kleinschreibung beachtet. Tragen zwei Dateien
/// denselben angezeigten Namen (wörtlich `f⟨0xFF⟩.txt` neben `f\xFF.txt`, oder `a⟨U+202E⟩b.txt` neben `a\u202eb.txt`), ist keine
/// gemeint — sonst zeigte eine Zeile den Patch der anderen und eine Anmerkung hätte keine unterscheidbare Stelle.
/// Trägt eine Datei Rohbytes, gehen beide Namen zeilenweise über stdin an git: dort trennt git an LF und schneidet CR ab,
/// ein Zeilenende in irgendeinem der beiden Namen machte daraus andere Pfade — und den Patch einer anderen Datei.
/// </summary>
internal static class Namenspruefung
{
    public static Namenstreffer Pruefe(Dateiaenderungen dateienDesCommits, string pfad)
    {
        var treffer = DateienMitAngezeigtemPfad(dateienDesCommits, pfad);
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

    private static List<Dateiaenderung> DateienMitAngezeigtemPfad(Dateiaenderungen dateienDesCommits, string pfad)
    {
        var treffer = new List<Dateiaenderung>();
        var gesucht = UnsichtbareZeichen.AlsMarken(pfad);
        for (var stelle = 0; stelle < dateienDesCommits.Anzahl; stelle++)
        {
            var datei = dateienDesCommits[stelle];
            var istGesuchterPfad = string.Equals(UnsichtbareZeichen.AlsMarken(datei.Pfad), gesucht, StringComparison.Ordinal);
            if (istGesuchterPfad)
            {
                treffer.Add(datei);
            }
        }
        return treffer;
    }

    /// <summary>
    /// Der Fall je Datei eines Commits in **einem** Durchgang — dieselbe Regel wie <see cref="Pruefe"/>, aber ohne je Datei die
    /// ganze Liste neu zu vergleichen (die Übersicht der Auswahl zählt bis 2 000 Dateien). Trägt eine Datei mit einer anderen
    /// denselben angezeigten Namen, ist keine gemeint; sonst entscheidet die Übergabe des Namens an git.
    /// </summary>
    public static Namensfall[] FaelleJeDatei(Dateiaenderungen dateienDesCommits)
    {
        var anzahl = dateienDesCommits.Anzahl;
        var angezeigt = new string[anzahl];
        var vorkommen = new Dictionary<string, int>(StringComparer.Ordinal);
        for (var stelle = 0; stelle < anzahl; stelle++)
        {
            var name = UnsichtbareZeichen.AlsMarken(dateienDesCommits[stelle].Pfad);
            angezeigt[stelle] = name;
            vorkommen[name] = vorkommen.TryGetValue(name, out var bisher) ? bisher + 1 : 1;
        }
        var faelle = new Namensfall[anzahl];
        for (var stelle = 0; stelle < anzahl; stelle++)
        {
            if (vorkommen[angezeigt[stelle]] > 1)
            {
                faelle[stelle] = Namensfall.NichtEindeutig;
                continue;
            }
            var datei = dateienDesCommits[stelle];
            var gehtNichtAnGit = GehtUeberStdin(datei) && TraegtZeilenende(datei);
            if (gehtNichtAnGit)
            {
                faelle[stelle] = Namensfall.NichtUebergebbar;
                continue;
            }
            faelle[stelle] = Namensfall.Lesbar;
        }
        return faelle;
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
