using System.Globalization;
using System.Text;
using GitReviewA.Anmerkungen;
using GitReviewA.Fremdtext;

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

    public static string Formatiere(Anmerkungsliste anmerkungen)
    {
        var abschnitte = new List<string> { Ueberschrift };
        if (anmerkungen.Anzahl == 0)
        {
            abschnitte.Add(OhneAnmerkungen);
            return VerbindeAbschnitte(abschnitte);
        }
        abschnitte.Add(string.Create(CultureInfo.InvariantCulture, $"Anmerkungen: {anmerkungen.Anzahl}"));
        foreach (var anmerkung in anmerkungen)
        {
            abschnitte.Add(Stellenueberschrift(anmerkung));
            abschnitte.Add($"Commit: {anmerkung.Commit}");
            abschnitte.Add(AlsZitat(anmerkung.Text));
        }
        return VerbindeAbschnitte(abschnitte);
    }

    private static string VerbindeAbschnitte(List<string> abschnitte)
    {
        return string.Join(Zeilenende + Zeilenende, abschnitte) + Zeilenende;
    }

    private static string Stellenueberschrift(Anmerkung anmerkung)
    {
        var nummer = anmerkung.Nummer.ToString(CultureInfo.InvariantCulture);
        var datei = UnsichtbareZeichen.AlsMarken(anmerkung.Datei);
        if (anmerkung.Zeile is not { } zeile)
        {
            return $"## {nummer}. {datei} (ganze Datei)";
        }
        return $"## {nummer}. {datei}:{zeile.ToString(CultureInfo.InvariantCulture)}";
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
