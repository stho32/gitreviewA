using GitReviewA.Git;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Git;

public class DateiaenderungenParserTests
{
    private const string Ohne = "0000000000000000000000000000000000000000";
    private const string Blob1 = "1191247b6d9a206f6ba3d8ac79e26d041dd86941";
    private const string Blob2 = "94ebaf900161394059478fd88aec30e59092a1d7";

    [Test]
    public void Wenn_Ausgabe_leer_dann_keine_Dateiaenderungen()
    {
        var aenderungen = DateiaenderungenParser.Parse("");

        Assert.That(aenderungen.Anzahl, Is.Zero);
    }

    [Test]
    public void Wenn_hinzugefuegt_geaendert_geloescht_dann_Status_Pfad_und_Zahlen_in_git_Reihenfolge()
    {
        var ausgabe = Roh(Ohne, Blob1, "A") + "neu.txt\0"
            + Roh(Blob1, Blob2, "M") + "src/b.txt\0"
            + Roh(Blob2, Ohne, "D") + "alt.txt\0"
            + "3\t0\tneu.txt\0" + "2\t1\tsrc/b.txt\0" + "0\t4\talt.txt\0";

        var aenderungen = DateiaenderungenParser.Parse(ausgabe).AlsArray();

        Assert.That(aenderungen, Is.EqualTo(new[]
        {
            new Dateiaenderung("A", "neu.txt", null, 3, 0),
            new Dateiaenderung("M", "src/b.txt", null, 2, 1),
            new Dateiaenderung("D", "alt.txt", null, 0, 4),
        }));
    }

    [Test]
    public void Wenn_umbenannt_dann_R_mit_neuem_und_altem_Pfad()
    {
        var ausgabe = Roh(Blob1, Blob1, "R100") + "README.md\0LIESMICH.md\0" + "0\t0\t\0README.md\0LIESMICH.md\0";

        var aenderungen = DateiaenderungenParser.Parse(ausgabe).AlsArray();

        Assert.That(aenderungen, Is.EqualTo(new[] { new Dateiaenderung("R", "LIESMICH.md", "README.md", 0, 0) }));
    }

    [Test]
    public void Wenn_Binaerdatei_dann_ohne_Zahlen()
    {
        var ausgabe = Roh(Ohne, Blob1, "A") + "logo.bin\0" + "-\t-\tlogo.bin\0";

        var aenderungen = DateiaenderungenParser.Parse(ausgabe).AlsArray();

        Assert.That(aenderungen, Is.EqualTo(new[] { new Dateiaenderung("A", "logo.bin", null, null, null) }));
    }

    [TestCase("T")]
    [TestCase("U")]
    [TestCase("X")]
    public void Wenn_sonstiger_Status_dann_M(string status)
    {
        var ausgabe = Roh(Blob1, Blob2, status) + "datei\0" + "1\t1\tdatei\0";

        var aenderung = DateiaenderungenParser.Parse(ausgabe).AlsArray().Single();

        Assert.That(aenderung.Status, Is.EqualTo("M"));
    }

    [TestCase("ä ö.txt")]
    [TestCase("<b>fett</b>.txt")]
    [TestCase("zeile\numbruch.txt")]
    [TestCase(":beginnt mit Doppelpunkt")]
    [TestCase("1\t2\tsieht aus wie numstat")]
    public void Wenn_Pfad_Sonderzeichen_enthaelt_dann_unveraendert(string pfad)
    {
        var ausgabe = Roh(Ohne, Blob1, "A") + pfad + "\0" + "1\t0\t" + pfad + "\0";

        var aenderung = DateiaenderungenParser.Parse(ausgabe).AlsArray().Single();

        Assert.That(aenderung, Is.EqualTo(new Dateiaenderung("A", pfad, null, 1, 0)));
    }

    [Test]
    public void Wenn_Zahl_der_numstat_Eintraege_nicht_passt_dann_GitFehler()
    {
        var ausgabe = Roh(Ohne, Blob1, "A") + "neu.txt\0";

        Assert.Throws<GitFehler>(() => DateiaenderungenParser.Parse(ausgabe));
    }

    [Test]
    public void Wenn_nach_den_Zahlen_weitere_Datensaetze_folgen_dann_GitFehler_statt_sie_zu_verschweigen()
    {
        var ersterElternteil = Roh(Ohne, Blob1, "A") + "a.txt\0" + "1\t0\ta.txt\0";
        var zweiterElternteil = Roh(Ohne, Blob2, "A") + "b.txt\0" + "1\t0\tb.txt\0";

        Assert.Throws<GitFehler>(() => DateiaenderungenParser.Parse(ersterElternteil + zweiterElternteil));
    }

    private static string Roh(string vorher, string nachher, string status)
    {
        return $":100644 100644 {vorher} {nachher} {status}\0";
    }
}
