using System.Globalization;

namespace GitReviewA.Git;

/// <summary>
/// Zerlegt die Ausgabe von `git log -z --format=…`. Datensätze und Felder trennt allein NUL — ein Byte, das in keinem Feld
/// eines Commits stehen kann: git schneidet eine Message am NUL ab (geprobt, R00048). Ein 0x1F oder 0x1E im Autor, im Betreff
/// oder im Rumpf verschiebt damit kein Feld mehr. Format und Zerleger stehen zusammen, damit die Feldzahl an einer Stelle
/// entschieden ist (R00048 Pflichtpunkt 5): Feldreihenfolge Hash, Autor, Datum, Betreff, Rumpf.
/// </summary>
internal static class GitLogAusgabe
{
    /// <summary>Das eine Format aller Commit-Angaben; `-z` hängt an jedem Datensatz denselben NUL-Trenner an.</summary>
    public const string Format = "--format=%H%x00%an%x00%aI%x00%s%x00%b";

    private const char Feldtrenner = '\0';
    private const int FelderJeDatensatz = 5;
    private const int HexHashKurz = 40;
    private const int HexHashLang = 64;

    /// <summary>
    /// Die Formen, in denen git `%aI` ausgibt (ISO 8601 strict): mit Zeitzone `±hh:mm`, bei UTC als `Z` — git 2.48 schreibt
    /// `+0000` und `-0000` beide als `Z` (geprobt). Ein Datum in einer anderen Form wird leer (Kriterium 11).
    /// </summary>
    private static readonly string[] Datumsformate =
    [
        "yyyy-MM-dd'T'HH:mm:sszzz",
        "yyyy-MM-dd'T'HH:mm:ss'Z'",
    ];

    public static Commitzeilen Zerlegen(string ausgabe)
    {
        var teile = OhneAbschluss(ausgabe.Split(Feldtrenner));
        var hatFeldzahl = teile.Length % FelderJeDatensatz == 0;
        if (!hatFeldzahl)
        {
            throw new GitFehler($"unerwartete Ausgabe von git log (Länge {ausgabe.Length}, {teile.Length} NUL-Teile für {FelderJeDatensatz} Felder je Commit)");
        }
        var zeilen = new List<Commitzeile>(teile.Length / FelderJeDatensatz);
        for (var stelle = 0; stelle < teile.Length; stelle += FelderJeDatensatz)
        {
            zeilen.Add(ZerlegeDatensatz(teile.AsSpan(stelle, FelderJeDatensatz)));
        }
        return new Commitzeilen(zeilen);
    }

    /// <summary>Der letzte NUL schließt den letzten Datensatz ab und ist kein Feld; leere Felder in der Mitte bleiben (F12).</summary>
    private static string[] OhneAbschluss(string[] teile)
    {
        var endetMitTrenner = teile.Length > 0 && teile[^1].Length == 0;
        return endetMitTrenner ? teile[..^1] : teile;
    }

    private static Commitzeile ZerlegeDatensatz(ReadOnlySpan<string> felder)
    {
        var hash = felder[0];
        if (!IstHash(hash))
        {
            throw new GitFehler($"unerwartete Ausgabe von git log (Hash mit {hash.Length} Zeichen statt {HexHashKurz} oder {HexHashLang} Kleinbuchstaben-Hexziffern)");
        }
        var rumpf = felder[4].TrimEnd('\n');
        return new Commitzeile(hash, felder[1], Datumsform(felder[2]), felder[3], rumpf);
    }

    private static bool IstHash(string hash)
    {
        var hatHashlaenge = hash.Length == HexHashKurz || hash.Length == HexHashLang;
        return hatHashlaenge && hash.All(IstHexziffer);
    }

    private static bool IstHexziffer(char zeichen)
    {
        return zeichen is >= '0' and <= '9' or >= 'a' and <= 'f';
    }

    /// <summary>
    /// Nur ein ISO-8601-Datum in einer der <see cref="Datumsformate"/> bleibt stehen; jeder andere Text wird leer (L2/Kriterium 11):
    /// git gibt bei einem NUL im Autorkopf den festen Text `%aI` aus, kein Datum. Das Datum geht unverändert weiter, wie git es
    /// liefert — `…Z` bleibt `…Z`, es wird nicht in eine andere Zeitzone umgerechnet. Leer bleibt leer — die Leiste zeigt
    /// „Datum nicht lesbar“.
    /// </summary>
    private static string Datumsform(string datum)
    {
        var istDatum = DateTimeOffset.TryParseExact(datum, Datumsformate, CultureInfo.InvariantCulture, DateTimeStyles.None, out _);
        return istDatum ? datum : string.Empty;
    }
}
