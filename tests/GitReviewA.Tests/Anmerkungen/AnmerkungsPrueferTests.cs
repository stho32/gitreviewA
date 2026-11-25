using GitReviewA.Anmerkungen;
using GitReviewA.Git;

namespace GitReviewA.Tests.Anmerkungen;

public class AnmerkungsPrueferTests
{
    private const string HashA = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";
    private const string HashB = "b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5";
    private const string HashAusserhalb = "c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6";

    [Test]
    public void Wenn_Commit_der_Auswahl_Datei_Zeile_und_Text_gueltig_dann_gueltig_mit_unveraenderten_Werten()
    {
        var neu = new NeueAnmerkung(HashB, "src/Foo.cs", 42, "Null-Prüfung fehlt\r\n> zweite Zeile");

        var ergebnis = AnmerkungsPruefer.Pruefe(neu, Auswahl());

        Assert.That(ergebnis.Anmerkung, Is.EqualTo(new GepruefteAnmerkung(HashB, "src/Foo.cs", 42, "Null-Prüfung fehlt\r\n> zweite Zeile")));
        Assert.That(ergebnis.IstGueltig, Is.True);
    }

    [Test]
    public void Wenn_ohne_Zeile_dann_gueltig_fuer_die_ganze_Datei()
    {
        var ergebnis = AnmerkungsPruefer.Pruefe(new NeueAnmerkung(HashA, "README.md", null, "veraltet"), Auswahl());

        Assert.That(ergebnis.Anmerkung, Is.EqualTo(new GepruefteAnmerkung(HashA, "README.md", null, "veraltet")));
    }

    [Test]
    [Description("R00031 Kriterium 1: der Bereich kommt als von/bis an und bleibt unverändert")]
    public void Wenn_von_3_bis_7_dann_gueltig_als_Bereich()
    {
        var ergebnis = AnmerkungsPruefer.Pruefe(new NeueAnmerkung(HashB, "src/Foo.cs", null, "Klammer fehlt", 3, 7), Auswahl());

        Assert.That(ergebnis.Anmerkung, Is.EqualTo(new GepruefteAnmerkung(HashB, "src/Foo.cs", null, "Klammer fehlt", 3, 7)));
        Assert.That(ergebnis.IstGueltig, Is.True);
    }

    [Test]
    [Description("R00031: ein Bereich aus einer Zeile ist zulässig (die Oberfläche schickt dafür zeile)")]
    public void Wenn_von_und_bis_dieselbe_Zeile_dann_gueltig()
    {
        var ergebnis = AnmerkungsPruefer.Pruefe(new NeueAnmerkung(HashA, "a.txt", null, "Text", 5, 5), Auswahl());

        Assert.That(ergebnis.Anmerkung, Is.EqualTo(new GepruefteAnmerkung(HashA, "a.txt", null, "Text", 5, 5)));
    }

    [TestCase(3, null, "bis")]
    [TestCase(null, 7, "von")]
    [TestCase(5, 3, "bis")]
    [TestCase(0, 7, "von")]
    [TestCase(3, 0, "bis")]
    [TestCase(-1, 7, "von")]
    [TestCase(3, -1, "bis")]
    [Description("R00031 Kriterium 6: die Form der Spanne — beide Zahlen, von ≥ 1, bis ≥ von")]
    public void Wenn_die_Spanne_ungueltig_dann_abgelehnt_mit_Grund(int? von, int? bis, string grundEnthaelt)
    {
        var ergebnis = AnmerkungsPruefer.Pruefe(new NeueAnmerkung(HashA, "a.txt", null, "Text", von, bis), Auswahl());

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Ablehnungsgrund, Does.Contain(grundEnthaelt));
    }

    [TestCase(1, 2)]
    [TestCase(42, 42)]
    [Description("R00031: zeile und von/bis schließen sich aus (400)")]
    public void Wenn_zeile_und_Spanne_zusammen_dann_abgelehnt(int von, int bis)
    {
        var ergebnis = AnmerkungsPruefer.Pruefe(new NeueAnmerkung(HashA, "a.txt", 7, "Text", von, bis), Auswahl());

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Ablehnungsgrund, Does.Contain("schließen sich aus"));
    }

    [TestCase(10_000)]
    [TestCase(1)]
    public void Wenn_Text_bis_10000_Zeichen_dann_gueltig(int laenge)
    {
        var ergebnis = AnmerkungsPruefer.Pruefe(new NeueAnmerkung(HashA, "a.txt", 1, new string('x', laenge)), Auswahl());

        Assert.That(ergebnis.IstGueltig, Is.True);
    }

    [Test]
    public void Wenn_10000_Zeichen_ausserhalb_der_Grundebene_dann_gueltig_und_eines_mehr_abgelehnt()
    {
        var zehntausend = string.Concat(Enumerable.Repeat("\U0001F600", 10_000));

        var grenze = AnmerkungsPruefer.Pruefe(new NeueAnmerkung(HashA, "a.txt", 1, zehntausend), Auswahl());
        var darueber = AnmerkungsPruefer.Pruefe(new NeueAnmerkung(HashA, "a.txt", 1, zehntausend + "x"), Auswahl());

        Assert.That((grenze.IstGueltig, darueber.IstGueltig), Is.EqualTo((true, false)));
    }

    [TestCase(HashAusserhalb, "a.txt", 1, "Text", "gehört nicht zur Auswahl")]
    [TestCase("a1b2c3d", "a.txt", 1, "Text", "gekürzt")]
    [TestCase("a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d", "a.txt", 1, "Text", "gekürzt")]
    [TestCase("A1B2C3D4E5F60718293A4B5C6D7E8F90A1B2C3D4", "a.txt", 1, "Text", "gehört nicht zur Auswahl")]
    [TestCase(HashA + "0", "a.txt", 1, "Text", "gehört nicht zur Auswahl")]
    [TestCase("", "a.txt", 1, "Text", "Commit fehlt")]
    [TestCase(null, "a.txt", 1, "Text", "Commit fehlt")]
    [TestCase(HashA, "", 1, "Text", "Datei fehlt")]
    [TestCase(HashA, "   ", 1, "Text", "Datei fehlt")]
    [TestCase(HashA, null, 1, "Text", "Datei fehlt")]
    [TestCase(HashA, "a.txt\n## 2. boese", 1, "Text", "Zeilenumbruch")]
    [TestCase(HashA, "a.txt\r", 1, "Text", "Zeilenumbruch")]
    [TestCase(HashA, "a\u0000.txt", 1, "Text", "Zeilenumbruch")]
    [TestCase(HashA, "a\u0085.txt", 1, "Text", "Zeilenumbruch")]
    [TestCase(HashA, "a\u2028.txt", 1, "Text", "Zeilenumbruch")]
    [TestCase(HashA, "a\u2029.txt", 1, "Text", "Zeilenumbruch")]
    [TestCase(HashA, "a.txt", 0, "Text", "Zeile")]
    [TestCase(HashA, "a.txt", -1, "Text", "Zeile")]
    [TestCase(HashA, "a.txt", int.MinValue, "Text", "Zeile")]
    [TestCase(HashA, "a.txt", 1, "", "Text fehlt")]
    [TestCase(HashA, "a.txt", 1, "   ", "Text fehlt")]
    [TestCase(HashA, "a.txt", 1, "\r\n\t", "Text fehlt")]
    [TestCase(HashA, "a.txt", 1, null, "Text fehlt")]
    public void Wenn_ein_Feld_ungueltig_dann_abgelehnt_mit_Grund(string? commit, string? datei, int? zeile, string? text, string grundEnthaelt)
    {
        var ergebnis = AnmerkungsPruefer.Pruefe(new NeueAnmerkung(commit, datei, zeile, text), Auswahl());

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Ablehnungsgrund, Does.Contain(grundEnthaelt));
    }

    [Test]
    public void Wenn_Text_10001_Zeichen_dann_abgelehnt_mit_Hoechstlaenge()
    {
        var ergebnis = AnmerkungsPruefer.Pruefe(new NeueAnmerkung(HashA, "a.txt", 1, new string('x', 10_001)), Auswahl());

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Ablehnungsgrund, Does.Contain("10000"));
    }

    [Test]
    public void Wenn_Datei_4096_Zeichen_dann_gueltig_und_mit_4097_abgelehnt_mit_Hoechstlaenge()
    {
        var grenze = AnmerkungsPruefer.Pruefe(new NeueAnmerkung(HashA, new string('d', 4096), 1, "Text"), Auswahl());
        var darueber = AnmerkungsPruefer.Pruefe(new NeueAnmerkung(HashA, new string('d', 4097), 1, "Text"), Auswahl());

        Assert.That((grenze.IstGueltig, darueber.IstGueltig), Is.EqualTo((true, false)));
        Assert.That(darueber.Ablehnungsgrund, Does.Contain("4096"));
    }

    [Test]
    public void Wenn_keine_Anmerkung_im_Koerper_dann_abgelehnt()
    {
        var ergebnis = AnmerkungsPruefer.Pruefe(null, Auswahl());

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Ablehnungsgrund, Does.Contain("Anmerkung fehlt"));
    }

    private static CommitAuswahl Auswahl()
    {
        return new CommitAuswahl(new Commitzeilen([new Commitzeile(HashA, "Testperson", "2026-01-01T09:00:00+00:00", "Erster", ""), new Commitzeile(HashB, "Testperson", "2026-01-01T09:00:00+00:00", "Zweiter", "")]));
    }
}
