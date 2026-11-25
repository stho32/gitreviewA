using System.Runtime.Versioning;
using System.Text.RegularExpressions;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Spezifikation R00022 „Datei annotieren“, Kriterien auf Ebene des Interactors (Szenarien 1, 2, 5, 6, 7 der User Story und die
/// Integrationsteile von Kriterium 1, 2, 5, 6, 7, 9): was angelegt, abgelehnt, gelistet und ausgegeben wird. Die Stelle ist derselbe
/// Request ohne `zeile` wie bei R00010 (Serverweg geteilt, B2104). Bedienung, DOM und Browser-Eigenes prüft
/// <c>e2e/tests/datei-annotieren.spec.js</c>, die Anzeige-Rechnung <c>e2e/tests/bausteine/anmerkungen-werte.spec.js</c>.
/// </summary>
[UnsupportedOSPlatform("windows")]
public class DateiAnnotierenTests
{
    private const string SteuerOderRichtung = "Text enthält Steuer- oder Richtungszeichen";
    private const string ZuLang = "Text ist länger als 10000 Zeichen";
    private const string KeinText = "Text fehlt";
    private const string Gesperrt = "Diff nicht lesbar: Name nicht eindeutig";

    [Test]
    public void Wenn_lang_txt_als_ganze_Datei_annotiert_dann_Ergebnis_mit_ganzer_Datei_und_vollem_Hash()
    {
        using var repo = DiffRepo.A();
        var gr = DateiAnnotierenSprache.Aufruf(repo, ["q", "p"]);

        var antwort = gr.Annotiere("q", "lang.txt", "Abschnitt fehlt");
        var ergebnis = gr.Beenden();

        Assert.That(antwort, Is.EqualTo(new Anlegeantwort("angelegt", 1, "")));
        Assert.That(ergebnis, Is.EqualTo("# Ergebnis manueller Review\n\nAnmerkungen: 1\n\n" + gr.Ergebnisabschnitt(1, "lang.txt (ganze Datei)", "q", "> Abschnitt fehlt")));
    }

    [Test]
    public void Wenn_zwei_Dateianmerkungen_und_eine_Zeilenanmerkung_dann_drei_in_Anlegereihenfolge()
    {
        using var repo = DiffRepo.A();
        var gr = DateiAnnotierenSprache.Aufruf(repo, ["q", "p"]);

        gr.Annotiere("q", "lang.txt", "erste");
        gr.Annotiere("q", "lang.txt", "zweite");
        gr.AnnotiereZeile("q", "lang.txt", 18, "Zeile");
        var ergebnis = gr.Beenden();

        Assert.That(Ueberschriften(ergebnis), Is.EqualTo(new[] { "## 1. lang.txt (ganze Datei)", "## 2. lang.txt (ganze Datei)", "## 3. lang.txt:18" }));
    }

    [Test]
    public void Wenn_mehrere_Dateianmerkungen_dann_in_Anlegereihenfolge_und_Zeile_null_in_der_Liste()
    {
        using var repo = DiffRepo.A();
        var gr = DateiAnnotierenSprache.Aufruf(repo, ["q", "p"]);

        gr.Annotiere("q", "lang.txt", "erste");
        gr.Annotiere("q", "src/b.txt", "zweite");

        Assert.That(gr.Anmerkungen(), Is.EqualTo(new[]
        {
            gr.Anmerkung(1, "q", "lang.txt", "erste"),
            gr.Anmerkung(2, "q", "src/b.txt", "zweite"),
        }));
        Assert.That(gr.Anmerkungen().Select(eintrag => eintrag.Zeile), Is.All.Null);
    }

    [Test]
    public void Wenn_eine_Datei_ohne_Zeilenänderung_annotiert_wird_dann_angenommen()
    {
        using var repo = DiffRepo.A();
        var gr = DateiAnnotierenSprache.Aufruf(repo, ["q", "p"]);

        var antwort = gr.Annotiere("q", "LIESMICH.md", "Lizenz fehlt");
        var ergebnis = gr.Beenden();

        Assert.That(antwort.Ausgang, Is.EqualTo("angelegt"));
        Assert.That(ergebnis, Does.EndWith("## 1. LIESMICH.md (ganze Datei)\n\nCommit: " + repo.Hash("q") + "\n\n> Lizenz fehlt\n"));
    }

    [TestCase("10001")]
    [TestCase("leer")]
    [TestCase("leerraum")]
    [TestCase("steuerzeichen")]
    public void Wenn_der_Text_ungueltig_dann_abgelehnt_mit_Grund_und_nichts_gespeichert(string fall)
    {
        using var repo = DiffRepo.A();
        var gr = DateiAnnotierenSprache.Aufruf(repo, ["q", "p"]);
        var text = new string('x', 10001);
        var erwarteterGrund = ZuLang;
        if (fall == "leer")
        {
            text = string.Empty;
            erwarteterGrund = KeinText;
        }
        else if (fall == "leerraum")
        {
            text = "   ";
            erwarteterGrund = KeinText;
        }
        else if (fall == "steuerzeichen")
        {
            text = Regex.Unescape(@"Klammer \u001B[2J fehlt");
            erwarteterGrund = SteuerOderRichtung;
        }

        var antwort = gr.Annotiere("q", "lang.txt", text);

        Assert.That(antwort, Is.EqualTo(new Anlegeantwort("ungültig", null, erwarteterGrund)));
        Assert.That(gr.Anmerkungen(), Is.Empty);
        Assert.That(gr.Beenden(), Does.EndWith("Keine Anmerkungen.\n"));
    }

    [Test]
    public void Wenn_Text_mit_Tab_Leerzeile_CRLF_Umlaut_und_Emoji_dann_angenommen_und_als_Zitat()
    {
        using var repo = DiffRepo.A();
        var gr = DateiAnnotierenSprache.Aufruf(repo, ["q", "p"]);
        var familie = Regex.Unescape(@"\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67");
        var text = $"Prüfen\tmit Tab\r\n\r\ngrößer ≥ 3 {familie}";

        var antwort = gr.Annotiere("q", "lang.txt", text);
        var ergebnis = gr.Beenden();

        Assert.That(antwort.Ausgang, Is.EqualTo("angelegt"));
        Assert.That(ergebnis, Does.EndWith($"> Prüfen\tmit Tab\n>\n> größer ≥ 3 {familie}\n"));
    }

    [Test]
    public void Wenn_die_Stelle_gesperrt_ist_dann_abgelehnt_mit_Sperrgrund_an_lesbarer_Stelle_angenommen()
    {
        using var repo = DiffRepo.A();
        var gr = DateiAnnotierenSprache.Aufruf(repo, ["q", "p"]);
        gr.SperreAbJetzt("q", "lang.txt", Gesperrt, "README.md");

        var gesperrt = gr.Annotiere("q", "lang.txt", "geht nicht");
        var lesbar = gr.Annotiere("q", "README.md", "geht");

        Assert.That((gesperrt.Ausgang, gesperrt.Grund), Is.EqualTo(("ungültig", Gesperrt)));
        Assert.That(lesbar.Ausgang, Is.EqualTo("angelegt"));
        Assert.That(gr.Anmerkungen(), Is.EqualTo(new[] { gr.Anmerkung(1, "q", "README.md", "geht") }));
    }

    [Test]
    public void Wenn_nach_dem_Beenden_annotiert_dann_beendet_und_nicht_gespeichert()
    {
        using var repo = DiffRepo.A();
        var gr = DateiAnnotierenSprache.Aufruf(repo, ["q", "p"]);
        gr.Beenden();

        var antwort = gr.Annotiere("q", "lang.txt", "zu spät");

        Assert.That(antwort, Is.EqualTo(new Anlegeantwort("beendet", null, "Review ist beendet — keine Anmerkung mehr möglich")));
        Assert.That(gr.Anmerkungen(), Is.Empty);
    }

    [Test]
    public void Wenn_angelegt_und_abgelehnt_dann_Debug_Zeilen_mit_Nummer_und_Textlaenge_aber_nie_mit_dem_Text()
    {
        using var repo = DiffRepo.A();
        var gr = DateiAnnotierenSprache.Aufruf(repo, ["q", "p"]);

        gr.Annotiere("q", "lang.txt", "GEHEIMWORT eins");
        gr.Annotiere("q", "lang.txt", Regex.Unescape(@"GEHEIMWORT \u001B zwei"));

        var zeilen = gr.Protokollzeilen();
        Assert.That(zeilen, Has.Exactly(1).Contains("Nummer 1 angelegt (Textlänge 15, art=ohne)"));
        Assert.That(zeilen, Has.Exactly(1).Contains($"abgelehnt: {SteuerOderRichtung}"));
        Assert.That(gr.Protokoll(), Does.Not.Contain("GEHEIMWORT"));
    }

    [Test]
    public void Wenn_der_Name_Richtungs_Format_oder_Tag_Zeichen_traegt_dann_steht_in_der_Ueberschrift_die_Marke()
    {
        using var repo = DiffRepo.N();
        var gr = DateiAnnotierenSprache.Aufruf(repo, ["n"]);

        gr.Annotiere("n", "a.txt", "Kontrolle");
        foreach (var zeichen in DiffRepo.UnsichtbareZeichenInNamen)
        {
            gr.Annotiere("n", $"x{zeichen}y.txt", "Name");
        }
        var ueberschriften = Ueberschriften(gr.Beenden());

        Assert.That(ueberschriften, Is.EqualTo(new[]
        {
            "## 1. a.txt (ganze Datei)",
            "## 2. x⟨U+202E⟩y.txt (ganze Datei)",
            "## 3. x⟨U+2066⟩y.txt (ganze Datei)",
            "## 4. x⟨U+061C⟩y.txt (ganze Datei)",
            "## 5. x⟨U+200E⟩y.txt (ganze Datei)",
            "## 6. x⟨U+200B⟩y.txt (ganze Datei)",
            "## 7. x⟨U+FEFF⟩y.txt (ganze Datei)",
            "## 8. x⟨U+E0041⟩y.txt (ganze Datei)",
        }));
    }

    private static string[] Ueberschriften(string ergebnis)
    {
        return ergebnis.Split('\n').Where(zeile => zeile.StartsWith("## ", StringComparison.Ordinal)).ToArray();
    }
}
