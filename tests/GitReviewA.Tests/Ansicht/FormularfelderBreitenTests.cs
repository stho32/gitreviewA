using System.Text;
using System.Text.RegularExpressions;
using GitReviewA.Server;

namespace GitReviewA.Tests.Ansicht;

/// <summary>
/// B5506 (R00055, Kriterium 4): eine Feldbreite steht an **einer** Stelle — im Abschnitt „Formularfelder im Rollbereich“ in
/// `gitreviewa.css`. Dieser Wächter liest die beiden Stylesheets des Rollbereichs als Quelltext und meldet jede Längenbreite an
/// einem Feld-Selektor außerhalb des Abschnitts. Mutation: ein eingefügtes `.diff-suche{inline-size:20rem}` lässt ihn rot werden.
/// </summary>
public class FormularfelderBreitenTests
{
    /// <summary>Die Marke, mit der der eine Abschnitt einer Feldbreite im Stylesheet abgegrenzt ist.</summary>
    private const string AbschnittsMarke = "eine-Feldbreite";

    /// <summary>Die geteilte Klasse der Regel und die Klassen der Felder im Bestand (R00055, Ausgangssituation).</summary>
    private static readonly string[] FeldKlassen =
    [
        "formularfeld",
        "dateisuche-eingabe",
        "ausblenden-eingabe",
        "gr-waehler-auswahl",
        "diff-suche",
        "anm-eingabe",
        "da-suche",
    ];

    /// <summary>Nur diese Eigenschaften zählen als Längenbreite (WBS B5506); `min-inline-size` gehört zur Regel, nicht dazu.</summary>
    private static readonly string[] BreitenEigenschaften = ["width", "inline-size", "max-inline-size"];

    /// <summary>Ein Selektor, der ein Textfeld-Element nennt (`input`, `textarea`, `select`) — irgendwo im Verbund.</summary>
    private static readonly Regex FeldElement = new(@"(^|[\s>+~,])(input|textarea|select)(?![\w-])", RegexOptions.Compiled);

    /// <summary>Schalter, Kästchen und Optionsfelder sind keine Textfelder (R00055, Ausgangssituation): ihre Breite zählt nicht.</summary>
    private static readonly Regex KeinTextfeld = new(@"\.(ru-sch|schalter|haken-ziel|anm-art-wahl)\b", RegexOptions.Compiled);

    /// <summary>Eine Längenbreite hat einen Zahlenwert, ein Prozent oder eine Variable (`auto`/`none`/`unset` nicht).</summary>
    private static readonly Regex Laengenwert = new(@"\d|%|var\(", RegexOptions.Compiled);

    /// <summary>Jede Regel `Selektor { Rumpf }`; Medien-Abfragen liefern darin ihre inneren Regeln (verschachtelte Klammern matchen nicht).</summary>
    private static readonly Regex Regel = new(@"([^{}]+)\{([^{}]*)\}", RegexOptions.Singleline | RegexOptions.Compiled);

    private static readonly Regex Kommentar = new(@"/\*.*?\*/", RegexOptions.Singleline | RegexOptions.Compiled);

    [Test]
    public void Wenn_Feldbreiten_im_Quelltext_gesucht_dann_stehen_sie_nur_im_Abschnitt_der_Regel()
    {
        var gitreviewa = CssQuelltext("gitreviewa.css");
        var dateiansicht = CssQuelltext("dateiansicht.css");

        var ausserhalbDesAbschnitts = string.Concat(OhneAbschnitt(gitreviewa), "\n", dateiansicht);
        var feldbreiten = FeldbreitenImQuelltext(ausserhalbDesAbschnitts);

        Assert.That(feldbreiten, Is.Empty, $"Feldbreiten außerhalb des Abschnitts: {string.Join(" | ", feldbreiten)}");
    }

    [Test]
    public void Wenn_der_Abschnitt_gelesen_wird_dann_nennt_die_Regel_die_Obergrenze_in_ch()
    {
        var regel = OhneKommentare(Abschnitt(CssQuelltext("gitreviewa.css")));

        Assert.That(regel, Does.Contain("inline-size:100%"), "die Regel bindet die Breite an den Behälter");
        Assert.That(regel, Does.Contain("box-sizing:border-box"), "die Polsterung zählt zur Breite");
        Assert.That(regel, Does.Contain("min-inline-size:0"), "das Feld schrumpft mit");
        Assert.That(regel, Does.Contain("--feld-max"), "die Obergrenze steht in einer Eigenschaft");
        Assert.That(regel, Does.Match(@"\d+ch\b"), "die Obergrenze ist in ch angegeben");
    }

    private static string CssQuelltext(string pfad)
    {
        var oberflaeche = Oberflaeche.AusDemProgramm();
        var gefunden = oberflaeche.VersucheZuFinden(pfad, out var datei);
        Assert.That(gefunden, Is.True, $"{pfad} ist als eingebettete Datei vorhanden");
        return Encoding.UTF8.GetString(datei!.Inhalt);
    }

    private static string OhneAbschnitt(string styletext)
    {
        var (anfang, ende) = Abschnittsgrenzen(styletext);
        return string.Concat(styletext.AsSpan(0, anfang), styletext.AsSpan(ende));
    }

    private static string Abschnitt(string styletext)
    {
        var (anfang, ende) = Abschnittsgrenzen(styletext);
        return styletext[anfang..ende];
    }

    private static (int Anfang, int Ende) Abschnittsgrenzen(string styletext)
    {
        var anfang = styletext.IndexOf($"/* >>> {AbschnittsMarke} >>> */", StringComparison.Ordinal);
        Assert.That(anfang, Is.GreaterThanOrEqualTo(0), "der Abschnitt ist im Stylesheet ausgewiesen");
        var endeMarke = styletext.IndexOf($"/* <<< {AbschnittsMarke} <<< */", anfang, StringComparison.Ordinal);
        Assert.That(endeMarke, Is.GreaterThan(anfang), "der Abschnitt ist geschlossen");
        var markenLaenge = $"/* <<< {AbschnittsMarke} <<< */".Length;
        return (anfang, endeMarke + markenLaenge);
    }

    private static List<string> FeldbreitenImQuelltext(string styletext)
    {
        var ohneKommentare = OhneKommentare(styletext);
        var befunde = new List<string>();
        foreach (Match regel in Regel.Matches(ohneKommentare))
        {
            var selektor = regel.Groups[1].Value.Trim();
            var rumpf = regel.Groups[2].Value;
            var istFeldselektor = selektor.Split(',').Any(IstFeldselektor);
            if (!istFeldselektor)
            {
                continue;
            }
            befunde.AddRange(BreitenMitLaengenwert(selektor, rumpf));
        }
        return befunde;
    }

    private static IEnumerable<string> BreitenMitLaengenwert(string selektor, string rumpf)
    {
        foreach (var eigenschaft in BreitenEigenschaften)
        {
            var treffer = Regex.Match(rumpf, $@"(?:^|;)\s*{Regex.Escape(eigenschaft)}\s*:\s*([^;]+)");
            if (!treffer.Success)
            {
                continue;
            }
            var wert = treffer.Groups[1].Value.Trim();
            if (Laengenwert.IsMatch(wert))
            {
                yield return $"{selektor} {{{eigenschaft}:{wert}}}";
            }
        }
    }

    private static bool IstFeldselektor(string selektorteil)
    {
        var gekuerzt = selektorteil.Trim();
        if (KeinTextfeld.IsMatch(gekuerzt))
        {
            return false;
        }
        var traegtFeldklasse = FeldKlassen.Any(klasse => Regex.IsMatch(gekuerzt, $@"\.{Regex.Escape(klasse)}(?![\w-])"));
        return traegtFeldklasse || FeldElement.IsMatch(gekuerzt);
    }

    private static string OhneKommentare(string styletext)
    {
        return Kommentar.Replace(styletext, "");
    }
}
