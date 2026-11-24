using GitReviewA.Diff;
using GitReviewA.Fremdtext;
using GitReviewA.Git;

namespace GitReviewA.Tests.Diff;

public class NamenspruefungTests
{
    private static readonly Rohname FfTxt = new([0x66, 0xFF, 0x2E, 0x74, 0x78, 0x74]);

    [Test]
    public void Wenn_genau_eine_Datei_den_Namen_traegt_dann_lesbar_mit_dieser_Datei()
    {
        var gesucht = new Dateiaenderung("A", "a⟨0xFF⟩.sh", null, 1, 0, new Rohname([0x61, 0xFF, 0x2E, 0x73, 0x68]));
        var dateien = new Dateiaenderungen([new Dateiaenderung("A", "g.txt", null, 1, 0), gesucht]);

        var treffer = Namenspruefung.Pruefe(dateien, "a⟨0xFF⟩.sh");

        Assert.That(treffer, Is.EqualTo(new Namenstreffer(Namensfall.Lesbar, gesucht)));
    }

    [TestCase("G.txt")]
    [TestCase("g")]
    [TestCase("")]
    public void Wenn_keine_Datei_genau_den_Namen_traegt_dann_nicht_gefunden(string pfad)
    {
        var dateien = new Dateiaenderungen([new Dateiaenderung("A", "g.txt", null, 1, 0)]);

        var treffer = Namenspruefung.Pruefe(dateien, pfad);

        Assert.That(treffer, Is.EqualTo(new Namenstreffer(Namensfall.NichtGefunden, null)));
    }

    [Test]
    public void Wenn_der_woertliche_Name_und_der_Name_mit_dem_Byte_gleich_aussehen_dann_nicht_eindeutig_fuer_beide_Zeilen()
    {
        var woertlich = new Dateiaenderung("A", "f⟨0xFF⟩.txt", null, 1, 0);
        var mitByte = new Dateiaenderung("A", "f⟨0xFF⟩.txt", null, 1, 0, FfTxt);
        var dateien = new Dateiaenderungen([woertlich, mitByte]);

        var treffer = Namenspruefung.Pruefe(dateien, "f⟨0xFF⟩.txt");

        Assert.That(treffer, Is.EqualTo(new Namenstreffer(Namensfall.NichtEindeutig, null)));
    }

    [TestCase(new byte[] { 0x7A, 0x0A, 0xFF, 0x2E, 0x74 }, "z\n⟨0xFF⟩.t")]
    [TestCase(new byte[] { 0x63, 0xFF, 0x0D }, "c⟨0xFF⟩\r")]
    public void Wenn_die_Rohbytes_ein_Zeilenende_tragen_dann_nicht_uebergebbar(byte[] bytes, string name)
    {
        var dateien = new Dateiaenderungen([new Dateiaenderung("A", name, null, 1, 0, new Rohname(bytes))]);

        var treffer = Namenspruefung.Pruefe(dateien, name);

        Assert.That(treffer, Is.EqualTo(new Namenstreffer(Namensfall.NichtUebergebbar, null)));
    }

    [Test]
    public void Wenn_der_alte_Name_einer_Umbenennung_Rohbytes_mit_Zeilenende_traegt_dann_nicht_uebergebbar()
    {
        var umbenannt = new Dateiaenderung("R", "t.txt", "s\n⟨0xFE⟩", 1, 1, null, new Rohname([0x73, 0x0A, 0xFE]));
        var dateien = new Dateiaenderungen([umbenannt]);

        var treffer = Namenspruefung.Pruefe(dateien, "t.txt");

        Assert.That(treffer, Is.EqualTo(new Namenstreffer(Namensfall.NichtUebergebbar, null)));
    }

    [TestCase("h\nidden.txt")]
    [TestCase("h\r")]
    [TestCase("\nh")]
    public void Wenn_der_neue_Name_Zeilenende_traegt_und_der_alte_Rohbytes_dann_nicht_uebergebbar(string neuerName)
    {
        var umbenannt = new Dateiaenderung("R", neuerName, "o⟨0xFF⟩.txt", 1, 0, null, new Rohname([0x6F, 0xFF, 0x2E, 0x74, 0x78, 0x74]));
        var dateien = new Dateiaenderungen([umbenannt]);

        var treffer = Namenspruefung.Pruefe(dateien, neuerName);

        Assert.That(treffer, Is.EqualTo(new Namenstreffer(Namensfall.NichtUebergebbar, null)));
    }

    [TestCase("h\nidden.txt")]
    [TestCase("h\r")]
    public void Wenn_der_alte_Name_Zeilenende_traegt_und_der_neue_Rohbytes_dann_nicht_uebergebbar(string alterName)
    {
        var umbenannt = new Dateiaenderung("R", "n⟨0xFF⟩.txt", alterName, 1, 0, new Rohname([0x6E, 0xFF, 0x2E, 0x74, 0x78, 0x74]));
        var dateien = new Dateiaenderungen([umbenannt]);

        var treffer = Namenspruefung.Pruefe(dateien, "n⟨0xFF⟩.txt");

        Assert.That(treffer, Is.EqualTo(new Namenstreffer(Namensfall.NichtUebergebbar, null)));
    }

    [Test]
    public void Wenn_der_alte_Name_Rohbytes_traegt_und_der_neue_gueltig_ohne_Zeilenende_ist_dann_lesbar()
    {
        var umbenannt = new Dateiaenderung("R", "x.txt", "o⟨0xFF⟩.txt", 1, 0, null, new Rohname([0x6F, 0xFF, 0x2E, 0x74, 0x78, 0x74]));
        var dateien = new Dateiaenderungen([umbenannt]);

        var treffer = Namenspruefung.Pruefe(dateien, "x.txt");

        Assert.That(treffer, Is.EqualTo(new Namenstreffer(Namensfall.Lesbar, umbenannt)));
    }

    [Test]
    public void Wenn_ein_Name_in_gueltigem_UTF_8_einen_Zeilenumbruch_traegt_dann_lesbar_ueber_das_Argument()
    {
        var mitZeilenumbruch = new Dateiaenderung("A", "ab\ncd.txt", null, 1, 0);
        var dateien = new Dateiaenderungen([mitZeilenumbruch]);

        var treffer = Namenspruefung.Pruefe(dateien, "ab\ncd.txt");

        Assert.That(treffer, Is.EqualTo(new Namenstreffer(Namensfall.Lesbar, mitZeilenumbruch)));
    }
}
