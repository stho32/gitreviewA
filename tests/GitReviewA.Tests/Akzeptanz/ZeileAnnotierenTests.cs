using System.Runtime.Versioning;
using System.Text.RegularExpressions;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Spezifikation R00010 „Zeile annotieren“, Kriterien auf Ebene des Interactors (Szenarien 1–5 und 7 der User Story, Kriterien 2, 3, 5, 7, 11):
/// was angelegt, abgelehnt, gelistet und ausgegeben wird. Zeile zu Stelle und Anzeige rechnet <c>e2e/tests/bausteine/anmerkungen-werte.spec.js</c>,
/// Bedienung, DOM und Zeit prüft <c>e2e/tests/zeile-annotieren.spec.js</c>.
/// </summary>
[UnsupportedOSPlatform("windows")]
public class ZeileAnnotierenTests
{
    private const string SteuerOderRichtung = "Text enthält Steuer- oder Richtungszeichen";

    [Test]
    public void Wenn_z19_in_lang_txt_annotiert_dann_nennt_das_Ergebnis_lang_txt_18_mit_vollem_Hash_und_Zitat()
    {
        using var repo = DiffRepo.A();
        var gr = ZeileAnnotierenSprache.Aufruf(repo, ["q", "p"]);

        var antwort = gr.Annotiere("q", "lang.txt", 18, "Klammer fehlt");
        var ergebnis = gr.Beenden();

        Assert.That(antwort, Is.EqualTo(new Anlegeantwort("angelegt", 1, "")));
        Assert.That(ergebnis, Is.EqualTo("# Ergebnis manueller Review\n\nAnmerkungen: 1\n\n" + gr.Ergebnisabschnitt(1, "lang.txt:18", "q", "> Klammer fehlt")));
    }

    [Test]
    public void Wenn_plus_ZWEI_und_danach_eins_annotiert_dann_src_b_txt_2_und_src_b_txt_1_in_dieser_Reihenfolge()
    {
        using var repo = DiffRepo.A();
        var gr = ZeileAnnotierenSprache.Aufruf(repo, ["q", "p"]);

        gr.Annotiere("q", "src/b.txt", 2, "groß");
        gr.Annotiere("q", "src/b.txt", 1, "bleibt");
        var ergebnis = gr.Beenden();

        Assert.That(Ueberschriften(ergebnis), Is.EqualTo(new[] { "## 1. src/b.txt:2", "## 2. src/b.txt:1" }));
    }

    [Test]
    public void Wenn_an_q_lang_txt_18_annotiert_dann_nennt_die_Liste_genau_diese_Stelle_und_nicht_p()
    {
        using var repo = DiffRepo.A();
        var gr = ZeileAnnotierenSprache.Aufruf(repo, ["q", "p"]);

        gr.Annotiere("q", "lang.txt", 18, "Klammer fehlt");

        Assert.That(gr.Anmerkungen(), Is.EqualTo(new[] { gr.Anmerkung(1, "q", "lang.txt", 18, "Klammer fehlt") }));
    }

    [Test]
    public void Wenn_an_Zeile_10_angelegt_die_nur_Aenderungen_nicht_zeigt_dann_steht_lang_txt_10_im_Ergebnis()
    {
        using var repo = DiffRepo.A();
        var gr = ZeileAnnotierenSprache.Aufruf(repo, ["q", "p"]);

        gr.Annotiere("q", "lang.txt", 10, "außerhalb");
        var ergebnis = gr.Beenden();

        Assert.That(Ueberschriften(ergebnis), Is.EqualTo(new[] { "## 1. lang.txt:10" }));
    }

    [Test]
    public void Wenn_dieselbe_Zeile_zweimal_annotiert_dann_beide_in_Anlegereihenfolge_in_Liste_und_Ergebnis()
    {
        using var repo = DiffRepo.A();
        var gr = ZeileAnnotierenSprache.Aufruf(repo, ["q", "p"]);

        gr.Annotiere("q", "lang.txt", 18, "Klammer fehlt");
        gr.Annotiere("q", "lang.txt", 18, "Zweite");
        var liste = gr.Anmerkungen();
        var ergebnis = gr.Beenden();

        Assert.That(liste, Is.EqualTo(new[] { gr.Anmerkung(1, "q", "lang.txt", 18, "Klammer fehlt"), gr.Anmerkung(2, "q", "lang.txt", 18, "Zweite") }));
        Assert.That(ergebnis, Does.EndWith(gr.Ergebnisabschnitt(1, "lang.txt:18", "q", "> Klammer fehlt") + "\n" + gr.Ergebnisabschnitt(2, "lang.txt:18", "q", "> Zweite")));
    }

    [Test]
    public void Wenn_drei_angelegt_eine_leere_abgelehnt_und_eine_angelegt_dann_Nummern_1_bis_4_in_Anlegereihenfolge_und_stabil()
    {
        using var repo = DiffRepo.A();
        var gr = ZeileAnnotierenSprache.Aufruf(repo, ["q", "p"]);

        var erste = gr.Annotiere("q", "lang.txt", 1, "eins");
        var zweite = gr.Annotiere("q", "lang.txt", 2, "zwei");
        var dritte = gr.Annotiere("q", "lang.txt", 3, "drei");
        var listeNachDreien = gr.Anmerkungen();
        var leer = gr.Annotiere("q", "lang.txt", 4, "");
        var fuenfte = gr.Annotiere("q", "lang.txt", 5, "fünf");

        Assert.That(new[] { erste.Nummer, zweite.Nummer, dritte.Nummer, fuenfte.Nummer }, Is.EqualTo(new int?[] { 1, 2, 3, 4 }));
        Assert.That(leer, Is.EqualTo(new Anlegeantwort("ungültig", null, "Text fehlt")));
        Assert.That(gr.Anmerkungen().Select(eintrag => (eintrag.Nummer, eintrag.Text)), Is.EqualTo(new[] { (1, "eins"), (2, "zwei"), (3, "drei"), (4, "fünf") }));
        Assert.That(gr.Anmerkungen()[..3], Is.EqualTo(listeNachDreien));
    }

    [TestCase(@"Klammer \u001B[2J fehlt")]
    [TestCase(@"Glocke \u0007")]
    [TestCase(@"\u009B31m rot")]
    [TestCase(@"gut\u202Etug")]
    public void Wenn_Text_mit_Steuer_oder_Richtungszeichen_dann_ungueltig_mit_Grund_und_nichts_gespeichert(string maskiert)
    {
        using var repo = DiffRepo.A();
        var gr = ZeileAnnotierenSprache.Aufruf(repo, ["q", "p"]);

        var antwort = gr.Annotiere("q", "lang.txt", 18, Regex.Unescape(maskiert));

        Assert.That(antwort, Is.EqualTo(new Anlegeantwort("ungültig", null, SteuerOderRichtung)));
        Assert.That(gr.Anmerkungen(), Is.Empty);
        Assert.That(gr.Beenden(), Does.EndWith("Keine Anmerkungen.\n"));
    }

    [Test]
    public void Wenn_Text_mit_Tab_Leerzeile_CRLF_Umlaut_und_Emoji_dann_angelegt_und_als_Zitat_im_Ergebnis()
    {
        using var repo = DiffRepo.A();
        var gr = ZeileAnnotierenSprache.Aufruf(repo, ["q", "p"]);
        var familie = Regex.Unescape(@"\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67");
        var text = $"a\tb\n\nPrüfen: größer ≥ 3\r\n{familie}";

        var antwort = gr.Annotiere("q", "lang.txt", 18, text);
        var ergebnis = gr.Beenden();

        Assert.That(antwort.Ausgang, Is.EqualTo("angelegt"));
        Assert.That(ergebnis, Does.EndWith($"> a\tb\n>\n> Prüfen: größer ≥ 3\n> {familie}\n"));
    }

    [Test]
    public void Wenn_Commit_nur_gekuerzt_dann_ungueltig_und_nichts_gespeichert()
    {
        using var repo = DiffRepo.A();
        var gr = ZeileAnnotierenSprache.Aufruf(repo, ["q", "p"]);

        var antwort = gr.AnnotiereMitGekuerztemHash("q", "lang.txt", 18, "Klammer fehlt");

        Assert.That(antwort.Ausgang, Is.EqualTo("ungültig"));
        Assert.That(antwort.Grund, Does.Contain("gekürzt"));
        Assert.That(gr.Anmerkungen(), Is.Empty);
    }

    [Test]
    public void Wenn_nach_dem_Beenden_annotiert_dann_beendet_und_nicht_gespeichert()
    {
        using var repo = DiffRepo.A();
        var gr = ZeileAnnotierenSprache.Aufruf(repo, ["q", "p"]);
        gr.Beenden();

        var antwort = gr.Annotiere("q", "lang.txt", 18, "zu spät");

        Assert.That(antwort, Is.EqualTo(new Anlegeantwort("beendet", null, "Review ist beendet — keine Anmerkung mehr möglich")));
        Assert.That(gr.Anmerkungen(), Is.Empty);
    }

    [Test]
    public void Wenn_angelegt_und_abgelehnt_dann_Debug_Zeilen_mit_Nummer_Textlaenge_und_Grund_aber_nie_mit_dem_Text()
    {
        using var repo = DiffRepo.A();
        var gr = ZeileAnnotierenSprache.Aufruf(repo, ["q", "p"]);

        gr.Annotiere("q", "lang.txt", 18, "GEHEIMWORT eins");
        gr.Annotiere("q", "lang.txt", 18, Regex.Unescape(@"GEHEIMWORT \u001B zwei"));

        var zeilen = gr.Protokollzeilen();
        Assert.That(zeilen, Has.Exactly(1).Contains("Nummer 1 angelegt (Textlänge 15)"));
        Assert.That(zeilen, Has.Exactly(1).Contains($"abgelehnt: {SteuerOderRichtung}"));
        Assert.That(gr.Protokoll(), Does.Not.Contain("GEHEIMWORT"));
    }

    private static string[] Ueberschriften(string ergebnis)
    {
        return ergebnis.Split('\n').Where(zeile => zeile.StartsWith("## ", StringComparison.Ordinal)).ToArray();
    }
}
