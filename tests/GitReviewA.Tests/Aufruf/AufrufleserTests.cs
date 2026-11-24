using GitReviewA.Aufruf;
using GitReviewA.Protokoll;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Aufruf;

public class AufrufleserTests
{
    private const string HashC = "c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6";
    private const string HashA = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";

    [Test]
    public void Wenn_nur_Hashes_angegeben_dann_Hashes_in_Aufrufreihenfolge_und_Standardwerte()
    {
        var ergebnis = Aufrufleser.Lesen([HashC, HashA]);

        var startauftrag = GueltigerStartauftrag(ergebnis);
        Assert.That(startauftrag.Hashes.AlsArray(), Is.EqualTo(new[] { HashC, HashA }));
        Assert.That(startauftrag.Port, Is.EqualTo(Aufrufleser.FreierPort));
        Assert.That(startauftrag.BrowserOeffnen, Is.True);
        Assert.That(startauftrag.Mindeststufe, Is.EqualTo(Protokollstufe.Warnung));
    }

    [TestCase("abcd")]
    [TestCase("ABCDEF0123")]
    [TestCase("aBcD1234")]
    [TestCase("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")]
    public void Wenn_Hash_aus_4_bis_64_Hexziffern_dann_gueltig(string hash)
    {
        var ergebnis = Aufrufleser.Lesen([hash]);

        var startauftrag = GueltigerStartauftrag(ergebnis);
        Assert.That(startauftrag.Hashes.AlsArray(), Is.EqualTo(new[] { hash }));
    }

    [TestCase("abc")]
    [TestCase("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0")]
    [TestCase("zzzz")]
    [TestCase("HEAD; touch pwn")]
    [TestCase("HEAD")]
    [TestCase("--upload-pack=x")]
    [TestCase("-abcd")]
    [TestCase("abcd\n")]
    [TestCase("abcd ")]
    [TestCase("")]
    [TestCase("abcd..ef01")]
    public void Wenn_Argument_kein_Hash_und_keine_Option_dann_Fehler(string argument)
    {
        var ergebnis = Aufrufleser.Lesen([HashA, argument]);

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Fehlermeldung, Is.Not.Empty);
    }

    [Test]
    public void Wenn_keine_Hashes_dann_Fehler()
    {
        var ergebnis = Aufrufleser.Lesen(["--kein-browser"]);

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Fehlermeldung, Does.Contain("Commit"));
    }

    [Test]
    public void Wenn_Port_angegeben_dann_dieser_Port()
    {
        var ergebnis = Aufrufleser.Lesen([HashA, "--port", "5123"]);

        var startauftrag = GueltigerStartauftrag(ergebnis);
        Assert.That(startauftrag.Port, Is.EqualTo(5123));
    }

    [TestCase("--port")]
    [TestCase("--port", "abc")]
    [TestCase("--port", "65536")]
    [TestCase("--port", "-1")]
    public void Wenn_Port_fehlt_oder_ungueltig_dann_Fehler(params string[] optionen)
    {
        var ergebnis = Aufrufleser.Lesen([HashA, .. optionen]);

        Assert.That(ergebnis.IstGueltig, Is.False);
    }

    [Test]
    public void Wenn_kein_Browser_gewuenscht_dann_wird_er_nicht_geoeffnet()
    {
        var ergebnis = Aufrufleser.Lesen(["--kein-browser", HashA]);

        var startauftrag = GueltigerStartauftrag(ergebnis);
        Assert.That(startauftrag.BrowserOeffnen, Is.False);
    }

    [Test]
    public void Wenn_verbose_dann_Mindeststufe_Debug()
    {
        var ergebnis = Aufrufleser.Lesen([HashA, "--verbose"]);

        var startauftrag = GueltigerStartauftrag(ergebnis);
        Assert.That(startauftrag.Mindeststufe, Is.EqualTo(Protokollstufe.Debug));
    }

    [Test]
    public void Wenn_quiet_dann_Mindeststufe_Fehler()
    {
        var ergebnis = Aufrufleser.Lesen([HashA, "--quiet"]);

        var startauftrag = GueltigerStartauftrag(ergebnis);
        Assert.That(startauftrag.Mindeststufe, Is.EqualTo(Protokollstufe.Fehler));
    }

    [Test]
    public void Wenn_verbose_und_quiet_zugleich_dann_Fehler()
    {
        var ergebnis = Aufrufleser.Lesen([HashA, "--verbose", "--quiet"]);

        Assert.That(ergebnis.IstGueltig, Is.False);
    }

    private static Startauftrag GueltigerStartauftrag(Aufrufergebnis ergebnis)
    {
        if (ergebnis.IstGueltig)
        {
            return ergebnis.Startauftrag;
        }
        Assert.Fail(ergebnis.Fehlermeldung);
        throw new InvalidOperationException("nicht erreichbar");
    }
}
