using System.Runtime.Versioning;
using System.Text.RegularExpressions;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Spezifikation R00031 „Zeilenbereich annotieren“ auf Ebene des Interactors (Kriterien 1, 8, 9, 11, 12 und 13 der Anforderung,
/// Szenarien 1, 5, 6, 8 und 9 der User Story): was ein Bereich anlegt, wie das Ergebnis ihn nennt und zitiert, was ohne lesbare
/// Zeilen geschieht. Die Auswahl im Browser prüft <c>e2e/tests/zeilenbereich-annotieren.spec.js</c>, die Rechnung
/// <c>e2e/tests/bausteine/bereich-werte.spec.js</c>.
/// </summary>
[Platform(Exclude = "Win", Reason = "Namen aus ungültigem UTF-8 gibt es nur unter Linux")]
[UnsupportedOSPlatform("windows")]
public class ZeilenbereichTests
{
    private const string UeberDerGrenze = "Diff nicht lesbar: über der Ausgabegrenze";
    private const string HinterDemDateiende = "Bereich liegt hinter dem Dateiende";
    private const string NichtUebergebbar = "Diff nicht lesbar: Name nicht übergebbar";

    [Test]
    [Description("R00031 Kriterium 1 und 9: der Bereich 3–7 wird angelegt und das Ergebnis nennt Stelle, Commit, Zitat und Text")]
    public void Wenn_Bereich_3_bis_7_angelegt_dann_Ergebnis_mit_Zitat_der_markierten_Zeilen()
    {
        using var repo = DiffRepo.Zeilenbereich();
        var gr = ZeileAnnotierenSprache.Aufruf(repo, ["r2", "r1"]);

        var antwort = gr.AnnotiereBereich("r2", "lang.txt", 3, 7, "Klammer fehlt");
        var ergebnis = gr.Beenden();

        Assert.That(antwort, Is.EqualTo(new Anlegeantwort("angelegt", 1, "")));
        Assert.That(ergebnis, Is.EqualTo("# Ergebnis manueller Review\n\nAnmerkungen: 1\n\n"
            + gr.Bereichsabschnitt(1, "lang.txt", 3, 7, "r2", ["z03", "z04", "Z05", "z06", "z07"], "Klammer fehlt")));
        // Wer `<Datei>:<Zahl>` liest, erhält die erste Zeile des Bereichs (R00031, „Grundform bleibt lesbar“).
        Assert.That(ergebnis, Does.Contain("## 1. lang.txt:3-7"));
    }

    [Test]
    [Description("R00031 Kriterium 12: ein Bereich über 23 Zeilen wird auf 20 Zeilen gekürzt, danach genau eine Restzeile")]
    public void Wenn_der_Bereich_23_Zeilen_umfasst_dann_20_Zeilen_und_eine_Restzeile()
    {
        using var repo = DiffRepo.Zeilenbereich();
        var gr = ZeileAnnotierenSprache.Aufruf(repo, ["r1"]);

        gr.AnnotiereBereich("r1", "lang.txt", 1, 23, "lang");
        var ergebnis = gr.Beenden();

        var erwartet = Enumerable.Range(1, 20).Select(nummer => $"    {nummer}: z{nummer:D2}").Append("    … (3 weitere Zeilen)");
        Assert.That(ergebnis, Does.Contain("\n\n" + string.Join("\n", erwartet) + "\n\n> lang\n"));
        Assert.That(ergebnis.Split('\n').Count(zeile => zeile.Contains("weitere Zeilen", StringComparison.Ordinal)), Is.EqualTo(1));
    }

    [Test]
    [Description("R00031 Kriterium 12: ein Bereich hinter dem Dateiende ergibt kein Zitat, aber den Grund auf stderr")]
    public void Wenn_der_Bereich_hinter_dem_Dateiende_liegt_dann_Abschnitt_ohne_Zitat_und_Grund_auf_stderr()
    {
        using var repo = DiffRepo.Zeilenbereich();
        var gr = ZeileAnnotierenSprache.Aufruf(repo, ["r2"]);

        gr.AnnotiereBereich("r2", "lang.txt", 3, 7, "lesbar");
        gr.AnnotiereBereich("r2", "lang.txt", 28, 40, "hinter dem Ende");
        var ergebnis = gr.Beenden();

        Assert.That(ergebnis, Does.Contain("## 1. lang.txt:3-7\n"));
        Assert.That(ergebnis, Does.Contain("## 2. lang.txt:28-40\n"));
        Assert.That(ergebnis, Does.Not.Contain("    28: "));
        Assert.That(gr.Protokollzeilen(), Has.Exactly(1).Contains(HinterDemDateiende));
        Assert.That(ergebnis, Does.Not.Contain(HinterDemDateiende), "das Ergebnis behauptet nichts über unlesbare Zeilen");
    }

    [Test]
    [Description("R00031 Kriterium 12: über der Ausgabegrenze fehlt das Zitat, der Grund steht auf stderr")]
    public void Wenn_die_Datei_ueber_der_Ausgabegrenze_liegt_dann_kein_Zitat_und_der_Grund_auf_stderr()
    {
        using var repo = DiffRepo.Zeilenbereich();
        var gr = ZeileAnnotierenSprache.AufrufMitKleinerAusgabegrenze(repo, ["r2"]);

        gr.AnnotiereBereich("r2", "lang.txt", 1, 2, "zu gross");
        var ergebnis = gr.Beenden();

        Assert.That(ergebnis, Is.EqualTo("# Ergebnis manueller Review\n\nAnmerkungen: 1\n\n"
            + $"## 1. lang.txt:1-2\n\nCommit: {repo.Hash("r2")}\n\n> zu gross\n"));
        Assert.That(gr.Protokollzeilen(), Has.Exactly(1).Contains(UeberDerGrenze));
    }

    [Test]
    [Description("R00031 Kriterium 13: unsichtbare und richtungsändernde Zeichen der markierten Zeilen stehen als Marke im Zitat")]
    public void Wenn_eine_markierte_Zeile_ein_Richtungszeichen_traegt_dann_steht_die_Marke_im_Zitat()
    {
        using var repo = DiffRepo.Zeilenbereich();
        var gr = ZeileAnnotierenSprache.Aufruf(repo, ["r1"]);

        gr.AnnotiereBereich("r1", "fremd.txt", 1, 2, "fremd");
        var ergebnis = gr.Beenden();

        Assert.That(ergebnis, Does.Contain("\n\n    1: <b>z20</b>\n    2: a⟨U+202E⟩b\n\n> fremd\n"));
        Assert.That(ergebnis, Does.Not.Contain('\u202E'));
    }

    [Test]
    [Description("R00031 Kriterium 8: eine Bereichsanmerkung wird über ihre stabile Nummer geändert und gelöscht, die Stelle bleibt")]
    public void Wenn_der_Bereich_geaendert_und_geloescht_wird_dann_bleibt_die_Stelle_und_die_Nummer_verfaellt()
    {
        using var repo = DiffRepo.Zeilenbereich();
        var gr = ZeileAnnotierenSprache.Aufruf(repo, ["r2"]);

        gr.AnnotiereBereich("r2", "lang.txt", 3, 7, "alt");
        gr.Annotiere("r2", "lang.txt", 20, "Zeile");
        var geaendert = gr.Aendere(1, "neu");
        var geloescht = gr.Loesche(1);
        var neuAngelegt = gr.AnnotiereBereich("r2", "lang.txt", 5, 10, "danach");
        var ergebnis = gr.Beenden();

        Assert.That((geaendert.Ausgang, geaendert.Geaendert!.Text, geaendert.Geaendert.Von, geaendert.Geaendert.Bis), Is.EqualTo(("geaendert", "neu", 3, 7)), "nur der Text wechselt, die Stelle bleibt");
        Assert.That((geloescht.Ausgang, geloescht.Geloeschte!.Nummer), Is.EqualTo(("geloescht", 1)));
        Assert.That(neuAngelegt.Nummer, Is.EqualTo(3), "die gelöschte Nummer wird nicht wiederverwendet");
        Assert.That(ergebnis, Does.Contain("## 1. lang.txt:20\n"), "die verbleibende wird als 1. nummeriert");
        Assert.That(ergebnis, Does.Contain("## 2. lang.txt:5-10\n"));
        Assert.That(ergebnis, Does.Not.Contain("lang.txt:3-7"));
    }

    [Test]
    [Description("R00031 Kriterium 7: ein Bereich an einer gesperrten Stelle (Repo N plus v) wird abgelehnt, dieselbe Datei in v nicht")]
    public void Wenn_ein_Bereich_an_einer_gesperrten_Stelle_dann_abgelehnt_und_keine_Nummer_verbraucht()
    {
        using var repo = FremdeNamenRepo.NMitV();
        var gr = HakenSperreSprache.Aufruf(repo, "n", "v");

        var paar = gr.AnnotiereBereich("n", "f⟨0xFF⟩.txt", 1, 2);
        // Die Anzeigeform des Namens (Marke statt Rohbyte): die Sperre der Übersicht vergleicht denselben kanonischen Namen.
        var zeilenumbruch = gr.AnnotiereBereich("n", "z⟨U+000A⟩⟨0xFF⟩.txt", 1, 2);
        var inV = gr.AnnotiereBereich("v", "f⟨0xFF⟩.txt", 1, 2);

        Assert.That((paar.Ausgang, paar.Grund), Is.EqualTo(("ungültig", "Diff nicht lesbar: Name nicht eindeutig")));
        Assert.That((zeilenumbruch.Ausgang, zeilenumbruch.Grund), Is.EqualTo(("ungültig", NichtUebergebbar)));
        Assert.That((inV.Ausgang, inV.Nummer), Is.EqualTo(("angelegt", 1)), "keine Nummer verbraucht");
    }

    [Test]
    [Description("R00031 NFA Performance: „Beenden“ mit 500 Bereichsanmerkungen bleibt unter 1 s (Messwert im Testprotokoll)")]
    public void Wenn_500_Bereichsanmerkungen_in_einer_Datei_dann_Beenden_unter_einer_Sekunde()
    {
        using var repo = DiffRepo.Zeilenbereich();
        var gr = ZeileAnnotierenSprache.Aufruf(repo, ["r1"]);
        for (var nummer = 0; nummer < 500; nummer++)
        {
            gr.AnnotiereBereich("r1", "lang.txt", nummer + 1, nummer + 2, "Text");
        }

        var uhr = System.Diagnostics.Stopwatch.StartNew();
        var ergebnis = gr.Beenden();
        uhr.Stop();

        TestContext.Out.WriteLine($"Beenden mit 500 Bereichsanmerkungen (Zitate gelesen): {uhr.Elapsed.TotalMilliseconds:F1} ms");
        Assert.That(ergebnis.Split('\n').Count(zeile => zeile.StartsWith("## ", StringComparison.Ordinal)), Is.EqualTo(500));
        Assert.That(uhr.Elapsed, Is.LessThan(TimeSpan.FromSeconds(1)));
    }
}
