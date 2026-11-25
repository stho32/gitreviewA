using System.Globalization;
using System.Text;
using GitReviewA.Anmerkungen;
using GitReviewA.Fremdtext;
using GitReviewA.Haken;

namespace GitReviewA.Beenden;

/// <summary>
/// Das Ergebnis manueller Review als Markdown (Format: R00002). Anmerkungstext steht immer als Zitat,
/// damit Text aus der Oberfläche keine Überschrift und keine Struktur des Ergebnisses erzeugen kann.
/// </summary>
internal static class ErgebnisFormatierer
{
    private const string Zeilenende = "\n";
    private const string Ueberschrift = "# Ergebnis manueller Review";
    private const string OhneAnmerkungen = "Keine Anmerkungen.";
    private const string DateienUeberschrift = "## Dateien";
    /** Höchstzahl Zeilen je Bereichszitat (R00031); danach genau eine Zeile mit dem Rest. */
    private const int HoechstzahlZitatzeilen = 20;

    /// <summary>
    /// `bereichszeilen` trägt je stabiler Nummer einer Bereichsanmerkung die gelesenen Zeilen (B3007); fehlt der Eintrag oder ist
    /// der Bereich nicht lesbar, bleibt der Abschnitt bei Stelle und Text — nichts wird still behauptet (R00031).
    /// </summary>
    public static string Formatiere(Anmerkungsliste anmerkungen, Dateienstand dateien, IReadOnlyDictionary<int, Bereichszeilenlesung>? bereichszeilen = null)
    {
        var abschnitte = new List<string> { Ueberschrift };
        abschnitte.AddRange(AnmerkungsAbschnitte(anmerkungen, bereichszeilen));
        abschnitte.AddRange(DateiAbschnitte(dateien));
        return VerbindeAbschnitte(abschnitte);
    }

    private static List<string> AnmerkungsAbschnitte(Anmerkungsliste anmerkungen, IReadOnlyDictionary<int, Bereichszeilenlesung>? bereichszeilen)
    {
        if (anmerkungen.Anzahl == 0)
        {
            return [OhneAnmerkungen];
        }
        var abschnitte = new List<string> { string.Create(CultureInfo.InvariantCulture, $"Anmerkungen: {anmerkungen.Anzahl}") };
        var position = 0;
        foreach (var anmerkung in anmerkungen)
        {
            position += 1;
            abschnitte.Add(Stellenueberschrift(position, anmerkung));
            abschnitte.Add($"Commit: {anmerkung.Commit}");
            var zitat = ZitatDerMarkiertenZeilen(anmerkung, bereichszeilen);
            if (zitat is not null)
            {
                abschnitte.Add(zitat);
            }
            abschnitte.Add(AlsZitat(anmerkung.Text));
        }
        return abschnitte;
    }

    private static string VerbindeAbschnitte(List<string> abschnitte)
    {
        return string.Join(Zeilenende + Zeilenende, abschnitte) + Zeilenende;
    }

    /// <summary>`## n.` ist die Position im Ergebnis (R00002), nicht die stabile Nummer der Anmerkung. Ein Bereich beginnt mit
        /// derselben Form wie eine Zeile (`<Datei>:<von>`) und trägt die zweite Nummer als Anhang (R00031).</summary>
    private static string Stellenueberschrift(int position, Anmerkung anmerkung)
    {
        var nummer = position.ToString(CultureInfo.InvariantCulture);
        var datei = UnsichtbareZeichen.AlsMarken(anmerkung.Datei);
        if (anmerkung.Von is { } von && anmerkung.Bis is { } bis)
        {
            return string.Create(CultureInfo.InvariantCulture, $"## {nummer}. {datei}:{von}-{bis}");
        }
        if (anmerkung.Zeile is not { } zeile)
        {
            return $"## {nummer}. {datei} (ganze Datei)";
        }
        return $"## {nummer}. {datei}:{zeile.ToString(CultureInfo.InvariantCulture)}";
    }

    /// <summary>
    /// Das Zitat der markierten Zeilen (R00031): je Zeile `    <Nummer neu>: <Text>` (vier Leerzeichen, damit Markdown einen
    /// Codeblock liest), höchstens <see cref="HoechstzahlZitatzeilen"/> Zeilen, danach genau eine Zeile mit dem Rest. Unsichtbares
    /// und Richtungsänderndes des fremden Textes steht als Marke — dieselbe eine Zeichenliste wie überall (`UnsichtbareZeichen`).
    /// </summary>
    private static string? ZitatDerMarkiertenZeilen(Anmerkung anmerkung, IReadOnlyDictionary<int, Bereichszeilenlesung>? bereichszeilen)
    {
        if (anmerkung.Von is not { } von || anmerkung.Bis is null || bereichszeilen is null || !bereichszeilen.TryGetValue(anmerkung.Nummer, out var lesung) || !lesung.IstLesbar)
        {
            return null;
        }
        var gezeigt = lesung.Zeilen.Length > HoechstzahlZitatzeilen ? lesung.Zeilen[..HoechstzahlZitatzeilen] : lesung.Zeilen;
        var zeilen = new List<string>(gezeigt.Length + 1);
        for (var stelle = 0; stelle < gezeigt.Length; stelle++)
        {
            var nummer = (von + stelle).ToString(CultureInfo.InvariantCulture);
            zeilen.Add($"    {nummer}: {UnsichtbareZeichen.AlsMarken(gezeigt[stelle])}");
        }
        var weitere = lesung.Zeilen.Length - gezeigt.Length;
        if (weitere > 0)
        {
            zeilen.Add(string.Create(CultureInfo.InvariantCulture, $"    … ({weitere} weitere Zeilen)"));
        }
        return string.Join(Zeilenende, zeilen);
    }

    /// <summary>
    /// Ab dem ersten Haken (R00011): abgehakte, dann ungeprüfte Stellen in der Reihenfolge der Übersicht. Ohne Haken fehlt der Abschnitt,
    /// das Ergebnis bleibt wie in R00002 — „Ungeprüft: alle“ wäre ohne einen Haken keine Aussage über das Prüfen.
    /// </summary>
    private static List<string> DateiAbschnitte(Dateienstand dateien)
    {
        var keinHakenGesetzt = dateien.Abgehakt == 0;
        if (keinHakenGesetzt)
        {
            return [];
        }
        var abgehakt = new List<string>();
        var ungeprueft = new List<string>();
        foreach (var stelle in dateien)
        {
            var zeile = Stellenzeile(stelle);
            if (stelle.Abgehakt)
            {
                abgehakt.Add(zeile);
            }
            else
            {
                ungeprueft.Add(zeile);
            }
        }
        var abschnitte = new List<string> { DateienUeberschrift };
        abschnitte.AddRange(Liste("Abgehakt", abgehakt, dateien.Gesamt));
        abschnitte.AddRange(Liste("Ungeprüft", ungeprueft, dateien.Gesamt));
        return abschnitte;
    }

    /// <summary>Eine gesperrte Stelle trägt ihren Sperrgrund (R00014); jede andere Zeile bleibt wie in R00011.</summary>
    private static string Stellenzeile(Stellenstand stelle)
    {
        var zeile = $"- {UnsichtbareZeichen.AlsMarken(stelle.Datei)} (Commit {stelle.Commit})";
        var istGesperrt = stelle.Sperrgrund.Length > 0;
        if (istGesperrt)
        {
            return $"{zeile} — {stelle.Sperrgrund}";
        }
        return zeile;
    }

    /// <summary>Kopfzeile „&lt;Art&gt;: k von m“, darunter die Zeilen; eine leere Liste hat nur die Kopfzeile.</summary>
    private static List<string> Liste(string art, List<string> zeilen, int gesamt)
    {
        var kopf = string.Create(CultureInfo.InvariantCulture, $"{art}: {zeilen.Count} von {gesamt}");
        if (zeilen.Count == 0)
        {
            return [kopf];
        }
        return [kopf, string.Join(Zeilenende, zeilen)];
    }

    private static string AlsZitat(string text)
    {
        var zeilen = text.ReplaceLineEndings(Zeilenende).Split(Zeilenende);
        var zitat = new StringBuilder();
        foreach (var zeile in zeilen)
        {
            if (zitat.Length > 0)
            {
                zitat.Append(Zeilenende);
            }
            zitat.Append(Zitatzeile(zeile));
        }
        return zitat.ToString();
    }

    private static string Zitatzeile(string zeile)
    {
        if (zeile.Length == 0)
        {
            return ">";
        }
        return "> " + zeile;
    }
}
