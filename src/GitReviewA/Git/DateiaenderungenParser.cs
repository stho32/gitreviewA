namespace GitReviewA.Git;

/// <summary>
/// Zerlegt die Ausgabe von <c>git show --raw --numstat -z</c>: erst je Datei ein Rohdatensatz (Status, Pfad, bei Umbenennung zwei Pfade),
/// danach je Datei in derselben Reihenfolge die Zeilenzahlen.
/// </summary>
internal static class DateiaenderungenParser
{
    private const char Nul = '\0';
    private const char Rohkennung = ':';
    private const string Binaerzahl = "-";
    private const string Geaendert = "M";
    private const int FelderJeZahlenzeile = 3;

    private static readonly string[] AngezeigteStatus = ["A", "M", "D", "R"];

    public static Dateiaenderungen Parse(string ausgabe)
    {
        var teile = ausgabe.Split(Nul);
        var position = 0;
        var rohdaten = LiesRohdaten(teile, ref position);
        var zahlen = LiesZahlen(teile, ref position, rohdaten.Count);
        PruefeVollstaendigGelesen(teile, position);
        return new Dateiaenderungen(rohdaten.Select((roh, index) => roh with { Plus = zahlen[index].Plus, Minus = zahlen[index].Minus }));
    }

    private static List<Dateiaenderung> LiesRohdaten(string[] teile, ref int position)
    {
        var rohdaten = new List<Dateiaenderung>();
        while (position < teile.Length && teile[position].StartsWith(Rohkennung))
        {
            var gitStatus = teile[position].Split(' ')[^1];
            position++;
            var traegtZweiPfade = gitStatus.StartsWith('R') || gitStatus.StartsWith('C');
            if (traegtZweiPfade)
            {
                rohdaten.Add(new Dateiaenderung(AngezeigterStatus(gitStatus), Teil(teile, position + 1), Teil(teile, position), null, null));
                position += 2;
                continue;
            }
            rohdaten.Add(new Dateiaenderung(AngezeigterStatus(gitStatus), Teil(teile, position), null, null, null));
            position++;
        }
        return rohdaten;
    }

    private static string AngezeigterStatus(string gitStatus)
    {
        var buchstabe = gitStatus[..1];
        var wirdAngezeigt = AngezeigteStatus.Contains(buchstabe);
        if (!wirdAngezeigt)
        {
            return Geaendert;
        }
        return buchstabe;
    }

    private static List<(int? Plus, int? Minus)> LiesZahlen(string[] teile, ref int position, int anzahl)
    {
        var zahlen = new List<(int? Plus, int? Minus)>();
        for (var nummer = 0; nummer < anzahl; nummer++)
        {
            var felder = Teil(teile, position).Split('\t', FelderJeZahlenzeile);
            var hatDreiFelder = felder.Length == FelderJeZahlenzeile;
            if (!hatDreiFelder)
            {
                throw new GitFehler($"unerwartete Ausgabe von git show (Zeilenzahlen der {nummer + 1}. Datei fehlen)");
            }
            zahlen.Add((Zahl(felder[0]), Zahl(felder[1])));
            var pfadFolgtGetrennt = felder[2].Length == 0;
            if (pfadFolgtGetrennt)
            {
                position += 2;
            }
            position++;
        }
        return zahlen;
    }

    private static void PruefeVollstaendigGelesen(string[] teile, int position)
    {
        var nurDasLetzteLeereTeilBleibt = position >= teile.Length - 1;
        if (!nurDasLetzteLeereTeilBleibt)
        {
            throw new GitFehler($"unerwartete Ausgabe von git show ({teile.Length - 1 - position} Teile nach der Dateiliste)");
        }
    }

    private static int? Zahl(string feld)
    {
        var istBinaer = feld == Binaerzahl;
        if (istBinaer)
        {
            return null;
        }
        return int.Parse(feld, System.Globalization.CultureInfo.InvariantCulture);
    }

    private static string Teil(string[] teile, int position)
    {
        var fehlt = position >= teile.Length;
        if (fehlt)
        {
            throw new GitFehler("unerwartete Ausgabe von git show (Datensatz endet vorzeitig)");
        }
        return teile[position];
    }
}
