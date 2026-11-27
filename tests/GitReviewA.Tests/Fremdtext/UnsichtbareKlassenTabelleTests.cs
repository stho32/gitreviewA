using System.Reflection;
using GitReviewA.Fremdtext;

namespace GitReviewA.Tests.Fremdtext;

/// <summary>
/// B5801 (R00058, Kriterium 2): die eine Klasse unsichtbarer Zeichen ist ihre gemeinsame Tabelle im Repo
/// (<c>tests/GitReviewA.Tests/Fremdtext/unsichtbare-klasse.txt</c>). Dieser Test tastet jeden Codepunkt U+0000–U+10FFFF ohne
/// Surrogate einzeln durch <see cref="UnsichtbareZeichen"/> und vergleicht mit der Tabelle; die Node-Abtastung und die
/// Abtastung im Browser lesen dieselbe Datei. Allquantor: geprüft wird die ganze Menge, nicht ein Beispiel.
/// </summary>
public class UnsichtbareKlassenTabelleTests
{
    private const string TabellenpfadInDerRepoWurzel = "tests/GitReviewA.Tests/Fremdtext/unsichtbare-klasse.txt";

    /// <summary>Die heutige Größe der Klasse (R00058) — die Tabelle ist maßgeblich, die Zahl hält sie fest.</summary>
    private const int ErwarteteAnzahl = 4273;

    /// <summary>Die Grenzen der Bereiche und je ein Zeichen knapp außerhalb — markiert bzw. nicht markiert (R00058, Kriterium 2).</summary>
    private static readonly int[] MarkierteRaender = [0xFE00, 0xFE0F, 0xE0000, 0xE0FFF, 0x2800, 0x3164];

    private static readonly int[] UnmarkierteNachbarn = [0xFDFF, 0xFE10, 0xE1000, 0x2801, 0x3163, 0x1161];

    [Test]
    public void Wenn_jeder_Codepunkt_durch_den_Server_laeuft_dann_markiert_er_genau_die_Codepunkte_der_Tabelle()
    {
        var tabelle = Tabelle();

        var abweichungen = CodepunkteMitAnderemErgebnis(tabelle.GehoertZurKlasse);

        Assert.That(abweichungen, Is.Empty, $"Codepunkte mit anderem Ergebnis als die Tabelle: {string.Join(", ", abweichungen)}");
    }

    [Test]
    public void Wenn_die_Tabelle_gelesen_wird_dann_traegt_sie_heute_4273_Codepunkte()
    {
        var tabelle = Tabelle();

        Assert.That(tabelle.Anzahl, Is.EqualTo(ErwarteteAnzahl));
    }

    [Test]
    public void Wenn_die_Raender_der_Bereiche_betrachtet_werden_dann_stimmen_sie()
    {
        var nichtMarkierteRaender = OhneMarke(MarkierteRaender);
        var markierteNachbarn = MitMarke(UnmarkierteNachbarn);

        Assert.That(nichtMarkierteRaender, Is.Empty, "diese Ränder müssen markiert sein");
        Assert.That(markierteNachbarn, Is.Empty, "diese Nachbarn dürfen nicht markiert sein");
    }

    [Test]
    public void Wenn_der_Text_ein_Tab_traegt_dann_gehoert_er_nicht_zur_Klasse()
    {
        Assert.That(UnsichtbareZeichen.EnthaeltUnsichtbares("\t"), Is.False);
        Assert.That(UnsichtbareZeichen.AlsMarken("a\tb"), Is.EqualTo("a\tb"));
    }

    /// <summary>Die Codepunkte, deren Markierung von der Tabelle abweicht (höchstens 20 genannt) — Surrogate ausgenommen.</summary>
    private static string[] CodepunkteMitAnderemErgebnis(bool[] gehoertZurKlasse)
    {
        var abweichungen = new List<string>();
        for (var codepunkt = 0x0000; codepunkt <= 0x10FFFF; codepunkt++)
        {
            if (codepunkt is >= 0xD800 and <= 0xDFFF)
            {
                continue;
            }
            var zeichen = char.ConvertFromUtf32(codepunkt);
            var erwartet = gehoertZurKlasse[codepunkt];
            var wirdMarkiert = UnsichtbareZeichen.AlsMarken(zeichen) != zeichen;
            var enthaeltUnsichtbares = UnsichtbareZeichen.EnthaeltUnsichtbares(zeichen);
            var markeStimmt = wirdMarkiert == erwartet;
            var enthaeltStimmt = enthaeltUnsichtbares == erwartet;
            if (!markeStimmt || !enthaeltStimmt)
            {
                if (abweichungen.Count < 20)
                {
                    abweichungen.Add($"U+{codepunkt:X4}");
                }
            }
        }
        return [.. abweichungen];
    }

    /// <summary>Die genannten Codepunkte, die die Klasse nicht markiert — als Marken für eine Fehlermeldung.</summary>
    private static string[] OhneMarke(int[] codepunkte)
    {
        return [.. codepunkte
            .Where(codepunkt => UnsichtbareZeichen.AlsMarken(char.ConvertFromUtf32(codepunkt)) == char.ConvertFromUtf32(codepunkt))
            .Select(codepunkt => $"U+{codepunkt:X4}")];
    }

    /// <summary>Die genannten Codepunkte, die die Klasse markiert — als Marken für eine Fehlermeldung.</summary>
    private static string[] MitMarke(int[] codepunkte)
    {
        return [.. codepunkte
            .Where(codepunkt => UnsichtbareZeichen.AlsMarken(char.ConvertFromUtf32(codepunkt)) != char.ConvertFromUtf32(codepunkt))
            .Select(codepunkt => $"U+{codepunkt:X4}")];
    }

    /// <summary>Die Tabelle als Nachschlagetafel über alle Codepunkte samt ihrer Anzahl; <c>#</c> beginnt einen Kommentar.</summary>
    private static (bool[] GehoertZurKlasse, int Anzahl) Tabelle()
    {
        var pfad = Path.Combine(RepoWurzel(), TabellenpfadInDerRepoWurzel);
        var gehoertZurKlasse = new bool[0x110000];
        var anzahl = 0;
        foreach (var zeile in File.ReadAllLines(pfad))
        {
            var inhalt = zeile.Trim();
            var istLeerOderKommentar = inhalt.Length == 0 || inhalt.StartsWith('#');
            if (istLeerOderKommentar)
            {
                continue;
            }
            var teile = inhalt.Split('-');
            var von = Convert.ToInt32(teile[0], 16);
            var bis = von;
            if (teile.Length > 1)
            {
                bis = Convert.ToInt32(teile[1], 16);
            }
            for (var codepunkt = von; codepunkt <= bis; codepunkt++)
            {
                if (!gehoertZurKlasse[codepunkt])
                {
                    gehoertZurKlasse[codepunkt] = true;
                    anzahl++;
                }
            }
        }
        return (gehoertZurKlasse, anzahl);
    }

    /// <summary>Die Repo-Wurzel aus der Assembly (csproj, <c>AssemblyMetadata</c>) — der Test läuft auch aus einem Ausgabeordner außerhalb des Repos.</summary>
    private static string RepoWurzel()
    {
        var angabe = typeof(UnsichtbareKlassenTabelleTests).Assembly
            .GetCustomAttributes<AssemblyMetadataAttribute>()
            .FirstOrDefault(eintrag => string.Equals(eintrag.Key, "RepoWurzel", StringComparison.Ordinal));
        Assert.That(angabe, Is.Not.Null, "die Assembly trägt den Pfad der Repo-Wurzel");
        return angabe!.Value!;
    }
}
