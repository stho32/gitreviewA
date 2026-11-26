using GitReviewA.Git;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Git;

public class GitLogAusgabeTests
{
    private const string HashC = "c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6";
    private const string HashA = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";
    private const string Hash64 = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";

    [Test]
    public void Wenn_zwei_Datensaetze_dann_zwei_Commitzeilen_in_gleicher_Reihenfolge_mit_Kurzhash_aus_7_Zeichen()
    {
        var ausgabe = Ausgabe(
            Datensatz(HashC, "Bernd Beispiel", "2026-03-05T18:30:00+01:00", "Dritter Commit", "Zeile eins\nZeile zwei\n"),
            Datensatz(HashA, "Anna Beispiel", "2026-03-04T09:15:00+01:00", "Erster Commit", ""));

        var zeilen = GitLogAusgabe.Zerlegen(ausgabe).AlsArray();

        Assert.That(zeilen, Is.EqualTo(new[]
        {
            new Commitzeile(HashC, "Bernd Beispiel", "2026-03-05T18:30:00+01:00", "Dritter Commit", "Zeile eins\nZeile zwei"),
            new Commitzeile(HashA, "Anna Beispiel", "2026-03-04T09:15:00+01:00", "Erster Commit", ""),
        }));
        Assert.That(zeilen[0].KurzHash, Is.EqualTo("c3d4e5f"));
        Assert.That(zeilen[1].KurzHash, Is.EqualTo("a1b2c3d"));
    }

    [Test]
    public void Wenn_Rumpf_Leerzeilen_enthaelt_dann_bleiben_sie_und_nur_der_Zeilenumbruch_am_Ende_faellt_weg()
    {
        var ausgabe = Ausgabe(Datensatz(HashA, "A", "2026-03-04T09:15:00+01:00", "Betreff", "Absatz eins\n\nAbsatz zwei\n\n"));

        var zeile = GitLogAusgabe.Zerlegen(ausgabe).AlsArray().Single();

        Assert.That(zeile.Rumpf, Is.EqualTo("Absatz eins\n\nAbsatz zwei"));
    }

    [Test]
    public void Wenn_Texte_Sonderzeichen_oder_leer_dann_unveraendert()
    {
        var ausgabe = Ausgabe(
            Datensatz(HashC, "<i>Mallory</i>", "2026-03-04T09:15:00+01:00", "<script>alert(1)</script> & „Ä“", "<b>fett</b>"),
            Datensatz(HashA, "", "2026-03-04T09:15:00+01:00", "", ""));

        var zeilen = GitLogAusgabe.Zerlegen(ausgabe).AlsArray();

        Assert.That(zeilen.Select(zeile => (zeile.Autor, zeile.Betreff, zeile.Rumpf)), Is.EqualTo(new[]
        {
            ("<i>Mallory</i>", "<script>alert(1)</script> & „Ä“", "<b>fett</b>"),
            ("", "", ""),
        }));
    }

    [Test]
    public void Wenn_Ausgabe_leer_dann_keine_Commitzeilen()
    {
        var zeilen = GitLogAusgabe.Zerlegen(string.Empty);

        Assert.That(zeilen.Anzahl, Is.Zero);
    }

    [Test]
    public void Wenn_Datensatz_zu_wenige_Felder_hat_dann_GitFehler()
    {
        var ausgabe = $"{HashA}\0nur Autor\0";

        Assert.Throws<GitFehler>(() => GitLogAusgabe.Zerlegen(ausgabe));
    }

    [Test]
    [Description("F1/F2, Kriterium 1: 0x1F im Autor, im Betreff und im Rumpf verschiebt kein Feld")]
    public void Wenn_0x1F_im_Autor_Betreff_und_Rumpf_dann_alle_fuenf_Felder_unverschoben()
    {
        var ausgabe = Ausgabe(Datensatz(HashA, "Anna\u001fBeispiel", "2026-03-04T09:15:00+01:00", "Betreff\u001fmit Trenner", "Rumpf\u001fmit Trenner\n"));

        var zeile = GitLogAusgabe.Zerlegen(ausgabe).AlsArray().Single();

        Assert.That(zeile, Is.EqualTo(new Commitzeile(
            HashA, "Anna\u001fBeispiel", "2026-03-04T09:15:00+01:00", "Betreff\u001fmit Trenner", "Rumpf\u001fmit Trenner")));
    }

    [Test]
    [Description("F3, Kriterium 2: 0x1E ist kein Trenner — bleibt im Wert stehen")]
    public void Wenn_0x1E_im_Feld_dann_bleibt_es_im_Wert()
    {
        var ausgabe = Ausgabe(Datensatz(HashA, "Bernd\u001eBeispiel", "2026-03-05T18:30:00+01:00", "Zweiter\u001e", "Zeile eins\u001f\u001f\nZeile zwei\n"));

        var zeile = GitLogAusgabe.Zerlegen(ausgabe).AlsArray().Single();

        Assert.That(zeile.Autor, Is.EqualTo("Bernd\u001eBeispiel"));
        Assert.That(zeile.Betreff, Is.EqualTo("Zweiter\u001e"));
        Assert.That(zeile.Rumpf, Is.EqualTo("Zeile eins\u001f\u001f\nZeile zwei"));
    }

    [Test]
    [Description("F4: 0x1F und 0x1E zugleich, am Anfang und am Ende, und ein Feld nur aus 0x1F")]
    public void Wenn_Trenner_am_Feldrand_und_ein_Feld_nur_aus_Trennern_dann_kein_Feld_verschwindet()
    {
        var ausgabe = Ausgabe(Datensatz(HashA, "\u001f\u001eName\u001e\u001f", "2026-03-04T09:15:00+01:00", "\u001f", "\u001f\u001f"));

        var zeile = GitLogAusgabe.Zerlegen(ausgabe).AlsArray().Single();

        Assert.That(zeile.Autor, Is.EqualTo("\u001f\u001eName\u001e\u001f"));
        Assert.That(zeile.Betreff, Is.EqualTo("\u001f"));
        Assert.That(zeile.Rumpf, Is.EqualTo("\u001f\u001f"));
    }

    [Test]
    [Description("F12: leere Felder bleiben an ihrer Stelle (RemoveEmptyEntries ist der Mutant)")]
    public void Wenn_Felder_leer_sind_dann_bleiben_sie_an_ihrer_Stelle()
    {
        var ausgabe = Ausgabe(
            Datensatz(HashA, "", "2026-03-04T09:15:00+01:00", "", ""),
            Datensatz(HashC, "A", "2026-03-05T18:30:00+01:00", "B", ""));

        var zeilen = GitLogAusgabe.Zerlegen(ausgabe).AlsArray();

        Assert.That(zeilen.Select(zeile => (zeile.Hash, zeile.Autor, zeile.Betreff, zeile.Rumpf)), Is.EqualTo(new[]
        {
            (HashA, "", "", ""),
            (HashC, "A", "B", ""),
        }));
    }

    [Test]
    [Description("L2/Kriterium 11: git gibt bei NUL im Autorkopf den festen Text %aI aus — das Datum wird leer, die Felder bleiben")]
    public void Wenn_Datum_nicht_ISO_mit_Zeitzone_ist_dann_wird_es_leer()
    {
        var ausgabe = Ausgabe(Datensatz(HashA, "NUL Name", "%aI", "NUL im Autorkopf", ""));

        var zeile = GitLogAusgabe.Zerlegen(ausgabe).AlsArray().Single();

        Assert.That(zeile.Datum, Is.Empty);
        Assert.That(zeile.Autor, Is.EqualTo("NUL Name"));
        Assert.That(zeile.Betreff, Is.EqualTo("NUL im Autorkopf"));
    }

    [TestCase("2026-03-04T09:15:00+01:00")]
    [TestCase("2026-03-04T09:15:00-05:00")]
    [TestCase("2026-03-04T09:15:00+00:00")]
    public void Wenn_Datum_ISO_mit_Zeitzone_dann_bleibt_es(string datum)
    {
        var ausgabe = Ausgabe(Datensatz(HashA, "A", datum, "B", ""));

        Assert.That(GitLogAusgabe.Zerlegen(ausgabe).AlsArray().Single().Datum, Is.EqualTo(datum));
    }

    [TestCase("2023-11-14T22:13:20Z")]
    [TestCase("2023-11-14T22:13:20+00:00")]
    [Description("F16: git 2.48 gibt %aI bei UTC als „…Z“ aus (+0000 und -0000) — das Datum bleibt stehen, wie git es liefert, nicht leer")]
    public void Wenn_Datum_in_UTC_dann_bleibt_es(string datum)
    {
        var ausgabe = Ausgabe(Datensatz(HashA, "A", datum, "B", ""));

        Assert.That(GitLogAusgabe.Zerlegen(ausgabe).AlsArray().Single().Datum, Is.EqualTo(datum));
    }

    [TestCase("")]
    [Description("ein leeres Datum bleibt leer (kein Ersatztext)")]
    public void Wenn_Datum_leer_dann_leer(string datum)
    {
        var ausgabe = Ausgabe(Datensatz(HashA, "A", datum, "B", ""));

        Assert.That(GitLogAusgabe.Zerlegen(ausgabe).AlsArray().Single().Datum, Is.Empty);
    }

    [TestCase("deadbeefdeadbeef")]
    [TestCase("a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d")]
    [TestCase("a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e")]
    [TestCase("A1B2C3D4E5F60718293A4B5C6D7E8F90A1B2C3D4")]
    [TestCase(" a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4")]
    [TestCase("g1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4")]
    public void Wenn_Hash_kein_40_oder_64_stelliger_Kleinbuchstaben_Hexwert_ist_dann_GitFehler(string hash)
    {
        var ausgabe = Ausgabe(Datensatz(hash, "A", "2026-03-04T09:15:00+01:00", "B", ""));

        Assert.Throws<GitFehler>(() => GitLogAusgabe.Zerlegen(ausgabe));
    }

    [Test]
    public void Wenn_Hash_64_Hexziffern_hat_dann_gelesen()
    {
        var ausgabe = Ausgabe(Datensatz(Hash64, "A", "2026-03-04T09:15:00+01:00", "B", ""));

        Assert.That(GitLogAusgabe.Zerlegen(ausgabe).AlsArray().Single().Hash, Is.EqualTo(Hash64));
    }

    [Test]
    public void Wenn_die_Zahl_der_NUL_Teile_nicht_durch_fuenf_teilbar_ist_dann_GitFehler()
    {
        var ausgabe = $"{HashA}\0Autor\0Datum\0Betreff\0";

        Assert.Throws<GitFehler>(() => GitLogAusgabe.Zerlegen(ausgabe));
    }

    [Test]
    [Description("E6: das Format trägt genau die vier NUL-Trenner und fünf Feldangaben, die der Zerleger kennt — eine Konstante für beide")]
    public void Wenn_das_Format_die_Felder_trennt_dann_feldzahl_gleich_der_des_Zerlegers()
    {
        var trenner = GitLogAusgabe.Format.Split("%x00").Length - 1;
        var ohneTrenner = GitLogAusgabe.Format.Replace("%x00", string.Empty, StringComparison.Ordinal);
        var felder = ohneTrenner.Split('%').Length - 1;

        Assert.That(GitLogAusgabe.Format, Does.Contain("--format="));
        Assert.That(trenner, Is.EqualTo(4), "vier Trenner für fünf Felder");
        Assert.That(felder, Is.EqualTo(5), "fünf Feldangaben (%H %an %aI %s %b)");
    }

    private static string Ausgabe(params string[] datensaetze)
    {
        return string.Join('\0', datensaetze) + "\0";
    }

    private static string Datensatz(string hash, string autor, string datum, string betreff, string rumpf)
    {
        return string.Join('\0', hash, autor, datum, betreff, rumpf);
    }
}
