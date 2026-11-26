using GitReviewA.Dateiansicht;

namespace GitReviewA.Tests.Dateiansicht;

/// <summary>
/// R00046 Kriterium 9 und die Grenzfälle: die Quellenart einer Angabe (4–64 Hex vor dem ersten `:`, sonst Datenträger),
/// `./` erzwingt den Datenträger, leerer Pfad, weitere `:`, LF/CR/U+FFFD, Hexlängen 3/4/64/65. Reine Operation, ohne git.
/// </summary>
public class QuellenartTests
{
    [TestCase("a.sql")]
    [TestCase("sql/a.sql")]
    [TestCase("./a.sql")]
    [TestCase("C:x.sql")]
    [TestCase("abc:x.sql")] // 3 Hexziffern genügen nicht
    [TestCase("g123:x.sql")] // g ist keine Hexziffer
    [TestCase("HEAD:sql/a.sql")] // Namen sind hier keine Commits (PO Zeile 207)
    [TestCase("main:sql/a.sql")]
    public void Wenn_die_Angabe_nach_Regel_keine_Commitquelle_ist_dann_Datentraeger(string angabe)
    {
        var erkannt = Quellenart.Erkenne(angabe);

        Assert.That(erkannt.Quelle, Is.InstanceOf<Datentraegerquelle>());
        Assert.That(((Datentraegerquelle)erkannt.Quelle!).Pfad, Is.EqualTo(angabe));
    }

    [TestCase("./cafe:x.sql")]
    [TestCase("./abcdef012345:sql/a.sql")]
    public void Wenn_mit_Punkt_Schrägstrich_vorn_dann_erzwingt_das_den_Datentraeger(string angabe)
    {
        var erkannt = Quellenart.Erkenne(angabe);

        Assert.That(erkannt.Quelle, Is.InstanceOf<Datentraegerquelle>());
        Assert.That(((Datentraegerquelle)erkannt.Quelle!).Pfad, Is.EqualTo(angabe));
    }

    [Test]
    public void Wenn_der_Hash_65_Hexziffern_hat_dann_Datentraeger()
    {
        var angabe = new string('a', 65) + ":x.sql";

        var erkannt = Quellenart.Erkenne(angabe);

        Assert.That(erkannt.Quelle, Is.InstanceOf<Datentraegerquelle>());
    }

    [TestCase("cafe:x.sql", "cafe")] // wäre ohne Regel eine Datei; 4 Hex vor dem ersten `:` macht sie zur Commitquelle
    [TestCase("0000:x.sql", "0000")]
    [TestCase("ABCD1234:sql/a.sql", "ABCD1234")]
    [TestCase("3f2a:x.sql", "3f2a")]
    [TestCase("0811d38f1dc923c1996e6b625237b0e84038426a:sql/a.sql", "0811d38f1dc923c1996e6b625237b0e84038426a")]
    public void Wenn_der_Hash_4_bis_64_Hexziffern_hat_dann_Commitquelle_mit_pfad_dahinter(string angabe, string hash)
    {
        var erkannt = Quellenart.Erkenne(angabe);

        Assert.That(erkannt.Quelle, Is.InstanceOf<Commitquelle>());
        var quelle = (Commitquelle)erkannt.Quelle!;
        Assert.That(quelle.Hash, Is.EqualTo(hash));
        Assert.That(quelle.Pfad, Is.EqualTo(angabe[(angabe.IndexOf(':') + 1)..]));
    }

    [Test]
    public void Wenn_der_Pfad_leer_ist_dann_Datentraeger()
    {
        var erkannt = Quellenart.Erkenne("abcdef:");

        Assert.That(erkannt.Quelle, Is.InstanceOf<Datentraegerquelle>());
        Assert.That(((Datentraegerquelle)erkannt.Quelle!).Pfad, Is.EqualTo("abcdef:"));
    }

    [Test]
    public void Wenn_weitere_Doppelpunkte_folgen_dann_gehoert_alles_dahinter_zum_Pfad()
    {
        var erkannt = Quellenart.Erkenne("abcdef:a:b.sql");

        Assert.That(erkannt.Quelle, Is.InstanceOf<Commitquelle>());
        Assert.That(((Commitquelle)erkannt.Quelle!).Pfad, Is.EqualTo("a:b.sql"));
    }

    [Test]
    public void Wenn_der_Pfad_mit_Doppelpunkt_beginnt_dann_ist_er_der_Pfad()
    {
        var erkannt = Quellenart.Erkenne("abcdef::x");

        Assert.That(erkannt.Quelle, Is.InstanceOf<Commitquelle>());
        Assert.That(((Commitquelle)erkannt.Quelle!).Pfad, Is.EqualTo(":x"));
    }

    [Test]
    public void Wenn_der_Commitpfad_einen_Zeilenumbruch_traegt_dann_Name_nicht_uebergebbar()
    {
        var mitLf = Quellenart.Erkenne("abcdef:sql/a\nb.sql");
        var mitCr = Quellenart.Erkenne("abcdef:sql/a\rb.sql");

        Assert.That(mitLf.IstErkannt, Is.False);
        Assert.That(mitLf.Grund?.Art, Is.EqualTo(Quellengrundart.NameNichtUebergebbar));
        Assert.That(mitCr.Grund?.Art, Is.EqualTo(Quellengrundart.NameNichtUebergebbar));
    }

    [Test]
    public void Wenn_der_Commitpfad_ein_Ersatzzeichen_traegt_dann_Name_nicht_uebergebbar()
    {
        var erkannt = Quellenart.Erkenne("abcdef:f\uFFFD.sql");

        Assert.That(erkannt.IstErkannt, Is.False);
        Assert.That(erkannt.Grund?.Art, Is.EqualTo(Quellengrundart.NameNichtUebergebbar));
    }
}
