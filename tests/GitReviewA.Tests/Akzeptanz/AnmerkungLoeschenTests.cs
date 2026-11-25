using System.Runtime.Versioning;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Spezifikation R00019 „Anmerkung löschen“, Kriterien auf Ebene des Interactors (Szenarien der User Story, Integrationsteile von
/// Kriterium 1–4, 5, 6, 7 und 11): was gelöscht, abgelehnt, gelistet und ausgegeben wird. Bedienung und DOM prüft
/// <c>e2e/tests/anmerkung-loeschen.spec.js</c>, die Anzeige-Rechnung <c>e2e/tests/bausteine/anmerkungen-werte.spec.js</c>,
/// die Endpunkte <c>tests/GitReviewA.Tests/Anmerkungen/AnmerkungLoeschenEndpunktTests.cs</c> und stdout am Programm
/// <c>e2e/tests/anmerkung-loeschen-programm.spec.js</c>.
/// </summary>
[UnsupportedOSPlatform("windows")]
public class AnmerkungLoeschenTests
{
    private const string Gesperrt = "Diff nicht lesbar: Name nicht eindeutig";

    [Test]
    public void Wenn_die_einzige_Anmerkung_geloescht_wird_dann_ist_sie_weg_und_das_Ergebnis_leer()
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungLoeschenSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAn("q", "lang.txt", 18, "Klammer fehlt");

        var antwort = gr.Loesche(1);
        var ergebnis = gr.Beenden();

        Assert.That(antwort, Is.EqualTo(new Loeschantwort("geloescht", gr.Anmerkung(1, "q", "lang.txt", 18, "Klammer fehlt"), string.Empty)));
        Assert.That(gr.Anmerkungen(), Is.Empty);
        Assert.That(ergebnis, Is.EqualTo("# Ergebnis manueller Review\n\nKeine Anmerkungen.\n"));
    }

    [Test]
    public void Wenn_die_erste_von_zwei_Anmerkungen_geloescht_wird_dann_rueckt_die_verbliebene_auf_Position_1()
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungLoeschenSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAn("q", "lang.txt", 18, "erster");
        gr.LegeAn("q", "src/b.txt", 2, "zweiter");

        gr.Loesche(1);
        var liste = gr.Anmerkungen();
        var ergebnis = gr.Beenden();

        Assert.That(liste, Is.EqualTo(new[] { gr.Anmerkung(2, "q", "src/b.txt", 2, "zweiter") }));
        Assert.That(ergebnis, Is.EqualTo("# Ergebnis manueller Review\n\nAnmerkungen: 1\n\n" + gr.Ergebnisabschnitt(1, "src/b.txt:2", "q", "> zweiter")));
    }

    [Test]
    public void Wenn_eine_Dateianmerkung_ohne_Zeile_geloescht_wird_dann_fehlt_die_Stelle_ganze_Datei()
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungLoeschenSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAn("q", "README.md", null, "Abschnitt Installation veraltet");
        gr.LegeAn("q", "lang.txt", 18, "Klammer fehlt");

        var antwort = gr.Loesche(1);
        var ergebnis = gr.Beenden();

        Assert.That(antwort.Ausgang, Is.EqualTo("geloescht"));
        Assert.That(gr.Anmerkungen(), Is.EqualTo(new[] { gr.Anmerkung(2, "q", "lang.txt", 18, "Klammer fehlt") }));
        Assert.That(ergebnis, Is.EqualTo("# Ergebnis manueller Review\n\nAnmerkungen: 1\n\n" + gr.Ergebnisabschnitt(1, "lang.txt:18", "q", "> Klammer fehlt")));
        Assert.That(ergebnis, Does.Not.Contain("README.md"));
    }

    [Test]
    public void Wenn_die_zweite_von_drei_geloescht_und_eine_vierte_angelegt_wird_dann_traegt_sie_Nummer_4()
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungLoeschenSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAn("q", "lang.txt", 1, "eins");
        gr.LegeAn("q", "lang.txt", 2, "zwei");
        gr.LegeAn("q", "lang.txt", 3, "drei");
        gr.Loesche(2);

        var vierte = gr.LegeAn("q", "lang.txt", 4, "vier");
        var ergebnis = gr.Beenden();

        Assert.That(vierte.Nummer, Is.EqualTo(4), "die gelöschte Nummer wird nicht wiederverwendet");
        Assert.That(gr.Anmerkungen().Select(eintrag => eintrag.Nummer), Is.EqualTo(new[] { 1, 3, 4 }));
        Assert.That(ergebnis, Does.Contain("Anmerkungen: 3\n"));
        Assert.That(Ueberschriften(ergebnis), Is.EqualTo(new[] { "## 1. lang.txt:1", "## 2. lang.txt:3", "## 3. lang.txt:4" }));
    }

    [Test]
    public void Wenn_die_Nummer_unbekannt_dann_abgelehnt_mit_NichtGefunden_und_die_Liste_bleibt()
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungLoeschenSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAn("q", "lang.txt", 18, "Klammer fehlt");

        var antwort = gr.Loesche(7);

        Assert.That(antwort.Ausgang, Is.EqualTo("nicht gefunden"));
        Assert.That(antwort.Grund, Is.EqualTo("Anmerkung 7 gibt es nicht"));
        Assert.That(gr.Anmerkungen(), Is.EqualTo(new[] { gr.Anmerkung(1, "q", "lang.txt", 18, "Klammer fehlt") }));
    }

    [Test]
    public void Wenn_der_Lauf_beendet_ist_dann_abgelehnt_als_Beendet_und_das_Ergebnis_bleibt()
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungLoeschenSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAn("q", "lang.txt", 18, "vorher");
        var ergebnis = gr.Beenden();

        var antwort = gr.Loesche(1);

        Assert.That(antwort, Is.EqualTo(new Loeschantwort("beendet", null, "Review ist beendet — keine Anmerkung mehr möglich")));
        Assert.That(gr.Beenden(), Is.EqualTo(ergebnis));
        Assert.That(gr.Anmerkungen(), Has.Length.EqualTo(1));
    }

    [Test]
    public void Wenn_die_Stelle_gesperrt_ist_dann_laesst_sich_die_Anmerkung_trotzdem_loeschen_das_Anlegen_bleibt_abgelehnt()
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungLoeschenSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAn("q", "lang.txt", 18, "gesperrt");
        gr.LegeAn("q", "README.md", null, "lesbar");
        gr.SperreAbJetzt("q", "lang.txt", Gesperrt, "README.md");

        var anlegen = gr.LegeAn("q", "lang.txt", 19, "geht nicht");
        var loeschen = gr.Loesche(1);
        var ergebnis = gr.Beenden();

        Assert.That((anlegen.Ausgang, anlegen.Grund), Is.EqualTo(("ungültig", Gesperrt)));
        Assert.That(loeschen.Ausgang, Is.EqualTo("geloescht"));
        Assert.That(gr.Anmerkungen(), Is.EqualTo(new[] { gr.Anmerkung(2, "q", "README.md", null, "lesbar") }));
        Assert.That(ergebnis, Does.Not.Contain("gesperrt"));
    }

    [Test]
    public void Wenn_geloescht_und_abgelehnt_dann_Debug_Zeilen_mit_Nummer_und_Grund_aber_nie_mit_dem_Text()
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungLoeschenSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAn("q", "lang.txt", 18, "GEHEIMWORT");
        gr.LegeAn("q", "src/b.txt", 2, "zweiter");

        gr.Loesche(1);
        gr.Loesche(7);

        var zeilen = gr.Protokollzeilen();
        Assert.That(zeilen, Has.Exactly(1).Contains("Nummer 1 gelöscht"));
        Assert.That(zeilen, Has.Exactly(1).Contains("abgelehnt: Anmerkung 7 gibt es nicht"));
        Assert.That(gr.Protokoll(), Does.Not.Contain("GEHEIMWORT"));
    }

    private static string[] Ueberschriften(string ergebnis)
    {
        return ergebnis.Split('\n').Where(zeile => zeile.StartsWith("## ", StringComparison.Ordinal)).ToArray();
    }
}
