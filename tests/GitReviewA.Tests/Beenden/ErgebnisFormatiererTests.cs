using GitReviewA.Anmerkungen;
using GitReviewA.Beenden;

namespace GitReviewA.Tests.Beenden;

public class ErgebnisFormatiererTests
{
    private const string HashA = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";
    private const string HashB = "b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5";

    [Test]
    public void Wenn_keine_Anmerkungen_dann_Ueberschrift_Leerzeile_Keine_Anmerkungen_und_ein_Zeilenumbruch()
    {
        var ergebnis = ErgebnisFormatierer.Formatiere(new Anmerkungsliste([]));

        Assert.That(ergebnis, Is.EqualTo("# Ergebnis manueller Review\n\nKeine Anmerkungen.\n"));
    }

    [Test]
    public void Wenn_Dateiname_Richtungs_und_Tag_Zeichen_enthaelt_dann_steht_in_der_Ueberschrift_die_Marke_auch_bei_ganzer_Datei()
    {
        var anmerkungen = new Anmerkungsliste(
        [
            new Anmerkung(1, HashA, "evil\u202Etxt.exe", 3, "Zeile"),
            new Anmerkung(2, HashA, "x\U000E0041y.txt", null, "Datei"),
        ]);

        var ergebnis = ErgebnisFormatierer.Formatiere(anmerkungen);

        Assert.That(ergebnis, Does.Contain("\n## 1. evil⟨U+202E⟩txt.exe:3\n"));
        Assert.That(ergebnis, Does.Contain("\n## 2. x⟨U+E0041⟩y.txt (ganze Datei)\n"));
    }

    [Test]
    public void Wenn_stabile_Nummern_Luecken_haben_dann_zaehlen_die_Ueberschriften_nach_Position_1_2_3()
    {
        var anmerkungen = new Anmerkungsliste(
        [
            new Anmerkung(1, HashA, "a.txt", 1, "eins"),
            new Anmerkung(3, HashA, "a.txt", 3, "drei"),
            new Anmerkung(4, HashA, "a.txt", 4, "vier"),
        ]);

        var ergebnis = ErgebnisFormatierer.Formatiere(anmerkungen);

        var ueberschriften = ergebnis.Split('\n').Where(zeile => zeile.StartsWith("## ", StringComparison.Ordinal));
        Assert.That(ueberschriften, Is.EqualTo(new[] { "## 1. a.txt:1", "## 2. a.txt:3", "## 3. a.txt:4" }));
    }

    [Test]
    public void Wenn_zwei_Anmerkungen_dann_genau_das_Beispiel_der_Anforderung()
    {
        var anmerkungen = new Anmerkungsliste(
        [
            new Anmerkung(1, HashA, "src/Foo.cs", 42, "Null-Prüfung fehlt"),
            new Anmerkung(2, HashB, "README.md", null, "Abschnitt Installation veraltet"),
        ]);

        var ergebnis = ErgebnisFormatierer.Formatiere(anmerkungen);

        Assert.That(ergebnis, Is.EqualTo(
            "# Ergebnis manueller Review\n\nAnmerkungen: 2\n\n"
            + "## 1. src/Foo.cs:42\n\nCommit: " + HashA + "\n\n> Null-Prüfung fehlt\n\n"
            + "## 2. README.md (ganze Datei)\n\nCommit: " + HashB + "\n\n> Abschnitt Installation veraltet\n"));
    }

    [Test]
    public void Wenn_Text_mehrzeilig_mit_Ueberschrift_dann_jede_Zeile_als_Zitat_und_leere_Zeile_als_Zitatzeichen()
    {
        var ergebnis = ErgebnisFormatierer.Formatiere(new Anmerkungsliste([new Anmerkung(1, HashA, "src/Foo.cs", 1, "Zeile 1\n\n## Fertig")]));

        Assert.That(ergebnis, Does.EndWith("\n\n> Zeile 1\n>\n> ## Fertig\n"));
        Assert.That(ergebnis.Split('\n').Count(zeile => zeile.StartsWith('#')), Is.EqualTo(2));
    }

    [TestCase("a\r\nb\rc\nd")]
    [TestCase("a\r\n\r\nb")]
    public void Wenn_Zeilenenden_CRLF_oder_CR_dann_LF_und_jede_Zeile_zitiert(string text)
    {
        var ergebnis = ErgebnisFormatierer.Formatiere(new Anmerkungsliste([new Anmerkung(1, HashA, "a.txt", 1, text)]));

        Assert.That(ergebnis, Does.Not.Contain("\r"));
        var zitat = ergebnis[(ergebnis.IndexOf("\n\n>", StringComparison.Ordinal) + 2)..];
        Assert.That(zitat.TrimEnd('\n').Split('\n'), Is.All.Match("^>( |$)"));
    }

    [Test]
    public void Wenn_Text_mit_Sonderzeichen_und_Einrueckung_dann_unveraendert_hinter_dem_Zitatzeichen()
    {
        var ergebnis = ErgebnisFormatierer.Formatiere(new Anmerkungsliste([new Anmerkung(1, HashA, "a.txt", 1, "  Prüfen: größer ≥ 3 <b>`x`</b>\t")]));

        Assert.That(ergebnis, Does.EndWith("\n\n>   Prüfen: größer ≥ 3 <b>`x`</b>\t\n"));
    }

    [Test]
    public void Wenn_500_Anmerkungen_dann_Abschnitte_1_bis_500_in_Reihenfolge()
    {
        var anmerkungen = new Anmerkungsliste(Enumerable.Range(1, 500).Select(nummer => new Anmerkung(nummer, HashA, "a.txt", nummer, new string('x', 200))));

        var ergebnis = ErgebnisFormatierer.Formatiere(anmerkungen);

        var ueberschriften = ergebnis.Split('\n').Where(zeile => zeile.StartsWith("## ", StringComparison.Ordinal));
        Assert.That(ueberschriften, Is.EqualTo(Enumerable.Range(1, 500).Select(nummer => $"## {nummer}. a.txt:{nummer}")));
        Assert.That(ergebnis, Does.StartWith("# Ergebnis manueller Review\n\nAnmerkungen: 500\n\n## 1. "));
    }
}
