using System.Text;
using GitReviewA.Fremdtext;

namespace GitReviewA.Git;

/// <summary>
/// Zerlegt die Ausgabe von <c>git show --raw --numstat -z</c>: erst je Datei ein Rohdatensatz (Status, Pfad, bei Umbenennung zwei Pfade),
/// danach je Datei in derselben Reihenfolge die Zeilenzahlen. Zerlegt wird in Bytezeichen (ein Zeichen je Byte, Latin-1): erst je Name
/// entscheidet sich, ob er gültiges UTF-8 ist — sonst trägt er die Marke <c>⟨0xFF⟩</c> und behält seine Bytes als Rohpfad.
/// </summary>
internal static class DateiaenderungenParser
{
    private const char Nul = '\0';
    private const char Rohkennung = ':';
    private const string Binaerzahl = "-";
    private const string Geaendert = "M";
    private const int FelderJeZahlenzeile = 3;

    private static readonly string[] AngezeigteStatus = ["A", "M", "D", "R"];

    public static Dateiaenderungen Parse(byte[] ausgabe)
    {
        var teile = TeileInBytezeichen(ausgabe);
        var position = 0;
        var dateien = LiesDateienEinesCommits(teile, ref position);
        PruefeVollstaendigGelesen(teile, position);
        return dateien;
    }

    /// <summary>Die Ausgabe an NUL zerlegt, jedes Byte als ein Zeichen: Status, Hashes und Zahlen sind ASCII, Namen bleiben verlustfrei.</summary>
    public static string[] TeileInBytezeichen(byte[] ausgabe)
    {
        return Encoding.Latin1.GetString(ausgabe).Split(Nul);
    }

    /// <summary>Liest ab <paramref name="position"/> die Datensätze eines Commits und lässt die Position hinter seinem letzten Teil stehen.</summary>
    public static Dateiaenderungen LiesDateienEinesCommits(string[] teile, ref int position)
    {
        var rohdaten = LiesRohdaten(teile, ref position);
        var zahlen = LiesZahlen(teile, ref position, rohdaten.Count);
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
                rohdaten.Add(Umbenannt(AngezeigterStatus(gitStatus), Teil(teile, position + 1), Teil(teile, position)));
                position += 2;
                continue;
            }
            rohdaten.Add(Einzeln(AngezeigterStatus(gitStatus), Teil(teile, position)));
            position++;
        }
        return rohdaten;
    }

    private static Dateiaenderung Einzeln(string status, string pfadInBytezeichen)
    {
        var (pfad, rohpfad) = Name(pfadInBytezeichen);
        return new Dateiaenderung(status, pfad, null, null, null, rohpfad);
    }

    private static Dateiaenderung Umbenannt(string status, string pfadInBytezeichen, string alterPfadInBytezeichen)
    {
        var (pfad, rohpfad) = Name(pfadInBytezeichen);
        var (alterPfad, rohAlterPfad) = Name(alterPfadInBytezeichen);
        return new Dateiaenderung(status, pfad, alterPfad, null, null, rohpfad, rohAlterPfad);
    }

    /// <summary>Der Name wie angezeigt; die Bytes nur, wenn er kein gültiges UTF-8 ist.</summary>
    private static (string Name, Rohname? Rohname) Name(string nameInBytezeichen)
    {
        var bytes = Encoding.Latin1.GetBytes(nameInBytezeichen);
        var name = FremdeBytes.Utf8MitBytemarken.GetString(bytes);
        var istGueltigesUtf8 = System.Text.Unicode.Utf8.IsValid(bytes);
        if (istGueltigesUtf8)
        {
            return (name, null);
        }
        return (name, new Rohname(bytes));
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

    public static void PruefeVollstaendigGelesen(string[] teile, int position)
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
        var istZeilenzahl = int.TryParse(feld, System.Globalization.NumberStyles.None, System.Globalization.CultureInfo.InvariantCulture, out var zeilenzahl);
        if (!istZeilenzahl)
        {
            throw new GitFehler("unerwartete Ausgabe von git show (Zeilenzahl ist keine Zahl)");
        }
        return zeilenzahl;
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
