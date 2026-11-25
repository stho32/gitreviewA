using System.Runtime.Versioning;
using System.Text.RegularExpressions;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Spezifikation R00018 „Anmerkung ändern“, Kriterien auf Ebene des Interactors (Szenarien 1–7 der User Story und die Integrationsteile
/// von Kriterium 2, 3, 8, 11, 13): was geändert, abgelehnt, gelistet und ausgegeben wird. Bedienung und DOM prüft
/// <c>e2e/tests/anmerkung-aendern.spec.js</c>, die Anzeige-Rechnung <c>e2e/tests/bausteine/anmerkungen-werte.spec.js</c>,
/// die Endpunkte <c>tests/GitReviewA.Tests/Anmerkungen/AnmerkungAendernEndpunktTests.cs</c>.
/// </summary>
[UnsupportedOSPlatform("windows")]
public class AnmerkungAendernTests
{
    private const string SteuerOderRichtung = "Text enthält Steuer- oder Richtungszeichen";
    private const string ZuLang = "Text ist länger als 10000 Zeichen";
    private const string KeinText = "Text fehlt";
    private const string Gesperrt = "Diff nicht lesbar: Name nicht eindeutig";

    [Test]
    public void Wenn_an_z19_die_Anmerkung_berichtigt_wird_dann_neuer_Text_an_gleicher_Stelle_und_im_Ergebnis()
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungAendernSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAn("q", "lang.txt", 18, "Klammer fehlt");

        var antwort = gr.Aendere(1, "Klammer und Typprüfung fehlt");
        var ergebnis = gr.Beenden();

        Assert.That(antwort, Is.EqualTo(new Aenderantwort("geändert", gr.Anmerkung(1, "q", "lang.txt", 18, "Klammer und Typprüfung fehlt"), "")));
        Assert.That(gr.Anmerkungen(), Is.EqualTo(new[] { gr.Anmerkung(1, "q", "lang.txt", 18, "Klammer und Typprüfung fehlt") }));
        Assert.That(ergebnis, Is.EqualTo("# Ergebnis manueller Review\n\nAnmerkungen: 1\n\n" + gr.Ergebnisabschnitt(1, "lang.txt:18", "q", "> Klammer und Typprüfung fehlt")));
    }

    [Test]
    public void Wenn_die_erste_von_zwei_Anmerkungen_geaendert_wird_dann_bleiben_Nummer_Stelle_Reihenfolge_und_die_zweite()
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungAendernSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAn("q", "lang.txt", 18, "erster");
        gr.LegeAn("q", "src/b.txt", 2, "zweiter");

        gr.Aendere(1, "erster, berichtigt");
        var liste = gr.Anmerkungen();
        var ergebnis = gr.Beenden();

        Assert.That(liste, Is.EqualTo(new[] { gr.Anmerkung(1, "q", "lang.txt", 18, "erster, berichtigt"), gr.Anmerkung(2, "q", "src/b.txt", 2, "zweiter") }));
        Assert.That(ergebnis, Does.EndWith(gr.Ergebnisabschnitt(1, "lang.txt:18", "q", "> erster, berichtigt") + "\n" + gr.Ergebnisabschnitt(2, "src/b.txt:2", "q", "> zweiter")));
        Assert.That(Ueberschriften(ergebnis), Is.EqualTo(new[] { "## 1. lang.txt:18", "## 2. src/b.txt:2" }));
    }

    [Test]
    public void Wenn_eine_Dateianmerkung_ohne_Zeile_geaendert_wird_dann_bleibt_die_Stelle_ganze_Datei()
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungAendernSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAn("q", "README.md", null, "Abschnitt Installation veraltet");

        var antwort = gr.Aendere(1, "Abschnitt Installation fehlt");
        var ergebnis = gr.Beenden();

        Assert.That(antwort.Ausgang, Is.EqualTo("geändert"));
        Assert.That(gr.Anmerkungen(), Is.EqualTo(new[] { gr.Anmerkung(1, "q", "README.md", null, "Abschnitt Installation fehlt") }));
        Assert.That(ergebnis, Does.EndWith("## 1. README.md (ganze Datei)\n\nCommit: " + repo.Hash("q") + "\n\n> Abschnitt Installation fehlt\n"));
    }

    [Test]
    public void Wenn_die_zweite_von_drei_Anmerkungen_geaendert_und_eine_vierte_angelegt_wird_dann_traegt_sie_Nummer_4()
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungAendernSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAn("q", "lang.txt", 1, "eins");
        gr.LegeAn("q", "lang.txt", 2, "zwei");
        gr.LegeAn("q", "lang.txt", 3, "drei");
        gr.Aendere(2, "zwei, berichtigt");

        var vierte = gr.LegeAn("q", "lang.txt", 4, "vier");

        Assert.That(vierte.Nummer, Is.EqualTo(4), "die Änderung verbraucht keine Nummer");
        Assert.That(gr.Anmerkungen().Select(eintrag => eintrag.Nummer), Is.EqualTo(new[] { 1, 2, 3, 4 }));
        Assert.That(gr.Anmerkungen()[1].Text, Is.EqualTo("zwei, berichtigt"));
    }

    [Test]
    public void Wenn_die_Anmerkung_selbst_ueber_die_Nummer_adressiert_wird_dann_bleibt_die_gleichnamige_an_derselben_Stelle()
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungAendernSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAn("q", "lang.txt", 18, "erste Fassung");
        gr.LegeAn("q", "lang.txt", 18, "zweite Fassung");

        gr.Aendere(2, "zweite Fassung, berichtigt");

        Assert.That(gr.Anmerkungen(), Is.EqualTo(new[]
        {
            gr.Anmerkung(1, "q", "lang.txt", 18, "erste Fassung"),
            gr.Anmerkung(2, "q", "lang.txt", 18, "zweite Fassung, berichtigt"),
        }));
    }

    [Test]
    public void Wenn_die_Nummer_unbekannt_dann_abgelehnt_mit_NichtGefunden_und_die_Liste_bleibt()
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungAendernSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAn("q", "lang.txt", 18, "Klammer fehlt");

        var antwort = gr.Aendere(7, "irgendwas");

        Assert.That(antwort.Ausgang, Is.EqualTo("nicht gefunden"));
        Assert.That(antwort.Grund, Is.Not.Empty);
        Assert.That(gr.Anmerkungen(), Is.EqualTo(new[] { gr.Anmerkung(1, "q", "lang.txt", 18, "Klammer fehlt") }));
    }

    [Test]
    public void Wenn_die_Anmerkung_zwischen_Finden_und_Ersetzen_wegfaellt_dann_NichtGefunden_mit_Nummer_statt_Beendet()
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungAendernSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAn("q", "lang.txt", 18, "alt");

        var antwort = gr.AendereMitVerschwundenerAnmerkung(1, "neu");

        Assert.That((antwort.Ausgang, antwort.Grund), Is.EqualTo(("nicht gefunden", "Anmerkung 1 gibt es nicht")));
        Assert.That(gr.Anmerkungen(), Is.EqualTo(new[] { gr.Anmerkung(1, "q", "lang.txt", 18, "alt") }));
    }

    [Test]
    public void Wenn_der_Lauf_beendet_ist_dann_abgelehnt_als_Beendet_und_das_Ergebnis_bleibt()
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungAendernSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAn("q", "lang.txt", 18, "vorher");
        var ergebnis = gr.Beenden();

        var antwort = gr.Aendere(1, "danach");

        Assert.That(antwort, Is.EqualTo(new Aenderantwort("beendet", null, "Review ist beendet — keine Anmerkung mehr möglich")));
        Assert.That(gr.Beenden(), Is.EqualTo(ergebnis));
    }

    [TestCase("10001")]
    [TestCase("leer")]
    [TestCase("leerraum")]
    [TestCase("steuerzeichen")]
    public void Wenn_der_Text_ungueltig_dann_abgelehnt_mit_der_Meldung_des_Anlegens_und_der_alte_Text_bleibt(string fall)
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungAendernSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAn("q", "lang.txt", 18, "alt");
        var neuerText = new string('x', 10001);
        var erwarteteMeldung = ZuLang;
        if (fall == "leer")
        {
            neuerText = string.Empty;
            erwarteteMeldung = KeinText;
        }
        else if (fall == "leerraum")
        {
            neuerText = "   ";
            erwarteteMeldung = KeinText;
        }
        else if (fall == "steuerzeichen")
        {
            neuerText = Regex.Unescape(@"Klammer \u001B[2J fehlt");
            erwarteteMeldung = SteuerOderRichtung;
        }

        var antwort = gr.Aendere(1, neuerText);

        Assert.That((antwort.Ausgang, antwort.Grund), Is.EqualTo(("ungültig", erwarteteMeldung)));
        Assert.That(gr.Anmerkungen(), Is.EqualTo(new[] { gr.Anmerkung(1, "q", "lang.txt", 18, "alt") }));
        Assert.That(gr.Beenden(), Does.Contain("> alt\n"));
    }

    [Test]
    public void Wenn_genau_10000_Zeichen_dann_angenommen()
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungAendernSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAn("q", "lang.txt", 18, "alt");
        var text = new string('x', 10000);

        var antwort = gr.Aendere(1, text);

        Assert.That((antwort.Ausgang, gr.Anmerkungen()[0].Text), Is.EqualTo(("geändert", text)));
    }

    [Test]
    public void Wenn_mehrzeilig_mit_Tab_CRLF_Umlaut_und_Emoji_dann_angenommen_und_im_Ergebnis_jede_Zeile_als_Zitat()
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungAendernSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAn("q", "lang.txt", 18, "alt");
        var familie = Regex.Unescape(@"\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67");
        var text = $"Prüfen\tmit Tab\r\n\r\ngrößer ≥ 3 {familie}";

        var antwort = gr.Aendere(1, text);
        var ergebnis = gr.Beenden();

        Assert.That(antwort.Ausgang, Is.EqualTo("geändert"));
        Assert.That(ergebnis, Does.EndWith($"> Prüfen\tmit Tab\n>\n> größer ≥ 3 {familie}\n"));
    }

    [TestCase(@"gut\u202Etug")]
    [TestCase(@"a\u200Fb")]
    [TestCase(@"\u009B31m rot")]
    public void Wenn_Richtungs_oder_Steuerzeichen_dann_abgelehnt_und_der_alte_Text_bleibt(string maskiert)
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungAendernSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAn("q", "lang.txt", 18, "alt");

        var antwort = gr.Aendere(1, Regex.Unescape(maskiert));

        Assert.That((antwort.Ausgang, antwort.Grund), Is.EqualTo(("ungültig", SteuerOderRichtung)));
        Assert.That(gr.Anmerkungen()[0].Text, Is.EqualTo("alt"));
    }

    [Test]
    public void Wenn_die_Stelle_laut_Uebersicht_gesperrt_ist_dann_abgelehnt_mit_Sperrgrund_an_lesbarer_Stelle_angenommen()
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungAendernSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAn("q", "lang.txt", 18, "gesperrt");
        gr.LegeAn("q", "README.md", null, "lesbar");
        gr.SperreAbJetzt("q", "lang.txt", Gesperrt, "README.md");

        var gesperrt = gr.Aendere(1, "geht nicht");
        var lesbar = gr.Aendere(2, "geht");

        Assert.That((gesperrt.Ausgang, gesperrt.Grund), Is.EqualTo(("ungültig", Gesperrt)));
        Assert.That(lesbar.Ausgang, Is.EqualTo("geändert"));
        Assert.That(gr.Anmerkungen(), Is.EqualTo(new[]
        {
            gr.Anmerkung(1, "q", "lang.txt", 18, "gesperrt"),
            gr.Anmerkung(2, "q", "README.md", null, "geht"),
        }));
    }

    [Test]
    public void Wenn_der_Koerper_keinen_Text_traegt_dann_abgelehnt_mit_Text_fehlt()
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungAendernSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAn("q", "lang.txt", 18, "alt");

        var antwort = gr.AendereOhneWunsch();

        Assert.That((antwort.Ausgang, antwort.Grund), Is.EqualTo(("ungültig", KeinText)));
        Assert.That(gr.Anmerkungen()[0].Text, Is.EqualTo("alt"));
    }

    [Test]
    public void Wenn_geaendert_und_abgelehnt_dann_Debug_Zeilen_mit_Nummer_und_Textlaenge_aber_nie_mit_dem_Text()
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungAendernSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAn("q", "lang.txt", 18, "alt");

        gr.Aendere(1, "GEHEIMWORT neu");
        gr.Aendere(1, Regex.Unescape(@"GEHEIMWORT \u001B zwei"));

        var zeilen = gr.Protokollzeilen();
        Assert.That(zeilen, Has.Exactly(1).Contains("Nummer 1 geändert (Textlänge 14, art=ohne)"));
        Assert.That(zeilen, Has.Exactly(1).Contains($"abgelehnt: {SteuerOderRichtung}"));
        Assert.That(gr.Protokoll(), Does.Not.Contain("GEHEIMWORT"));
    }

    [Test]
    [Description("R00036 Kriterium 5: Art setzen, wechseln und entfernen; Nummer, Stelle und Position bleiben; danach 409")]
    public void Wenn_die_Art_von_Muss_auf_Frage_und_dann_auf_ohne_wechselt_dann_bleiben_Nummer_Stelle_und_Position()
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungAendernSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAnMitArt("q", "lang.txt", 18, "Klammer fehlt", "muss");
        gr.LegeAn("q", "src/b.txt", 2, "zweite");

        var aufFrage = gr.AendereMitArt(1, "Klammer fehlt", "frage");
        var zwischenstand = gr.Anmerkungen();
        var aufOhne = gr.AendereOhneArt(1, "Klammer fehlt");
        var endstand = gr.Anmerkungen();

        Assert.That((aufFrage.Ausgang, aufOhne.Ausgang), Is.EqualTo(("geändert", "geändert")));
        Assert.That(zwischenstand, Is.EqualTo(new[]
        {
            gr.AnmerkungMitArt(1, "q", "lang.txt", 18, "Klammer fehlt", "frage"),
            gr.Anmerkung(2, "q", "src/b.txt", 2, "zweite"),
        }));
        Assert.That(endstand, Is.EqualTo(new[]
        {
            gr.Anmerkung(1, "q", "lang.txt", 18, "Klammer fehlt"),
            gr.Anmerkung(2, "q", "src/b.txt", 2, "zweite"),
        }), "Nummer und Stelle bleiben, die Art ist entfernt");

        gr.Beenden();
        var nachBeenden = gr.AendereMitArt(1, "spät", "idee");

        Assert.That((nachBeenden.Ausgang, nachBeenden.Grund), Is.EqualTo(("beendet", "Review ist beendet — keine Anmerkung mehr möglich")));
        Assert.That(gr.Anmerkungen(), Is.EqualTo(endstand), "nach dem Beenden bleibt der Stand");
    }

    [Test]
    [Description("R00036: ohne `art` im Körper bleibt die gespeicherte Art — der Text ist weiter allein änderbar")]
    public void Wenn_nur_der_Text_geaendert_wird_dann_bleibt_die_Art()
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungAendernSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAnMitArt("q", "lang.txt", 18, "Klammer fehlt", "idee");

        var antwort = gr.Aendere(1, "Klammer und Typ fehlt");

        Assert.That(antwort.Ausgang, Is.EqualTo("geändert"));
        Assert.That(gr.Anmerkungen(), Is.EqualTo(new[] { gr.AnmerkungMitArt(1, "q", "lang.txt", 18, "Klammer und Typ fehlt", "idee") }));
    }

    [TestCase("\"MUSS\"")]
    [TestCase("\"muss \"")]
    [TestCase("\"\"")]
    [TestCase("7")]
    [Description("R00036 Kriterium 4: eine unbekannte Art beim Ändern → 400 „Art unbekannt“, Text und Art bleiben")]
    public void Wenn_die_Art_beim_Aendern_unbekannt_dann_abgelehnt_und_die_Anmerkung_bleibt(string roh)
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungAendernSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAnMitArt("q", "lang.txt", 18, "alt", "muss");

        var antwort = gr.AendereMitRohart(1, "neu", roh);

        Assert.That((antwort.Ausgang, antwort.Grund), Is.EqualTo(("ungültig", "Art unbekannt")));
        Assert.That(gr.Anmerkungen(), Is.EqualTo(new[] { gr.AnmerkungMitArt(1, "q", "lang.txt", 18, "alt", "muss") }));
    }

    private static string[] Ueberschriften(string ergebnis)
    {
        return ergebnis.Split('\n').Where(zeile => zeile.StartsWith("## ", StringComparison.Ordinal)).ToArray();
    }
}