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
        Assert.That(startauftrag.Auswahl.Art, Is.EqualTo(Auswahlart.Einzelcommits));
        Assert.That(startauftrag.Auswahl.Hashes.AlsArray(), Is.EqualTo(new[] { HashC, HashA }));
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
        Assert.That(startauftrag.Auswahl.Hashes.AlsArray(), Is.EqualTo(new[] { hash }));
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
    public void Wenn_nur_Bereiche_angegeben_dann_Auswahl_aus_Bereichen_in_Aufrufreihenfolge()
    {
        var ergebnis = Aufrufleser.Lesen(["--kein-browser", "d4e5..HEAD", "main..feature", "--port", "5123"]);

        var startauftrag = GueltigerStartauftrag(ergebnis);
        Assert.That(startauftrag.Auswahl.Art, Is.EqualTo(Auswahlart.Bereiche));
        Assert.That(startauftrag.Auswahl.Bereiche.AlsArray(), Is.EqualTo(new[] { "d4e5..HEAD", "main..feature" }));
        Assert.That(startauftrag.Port, Is.EqualTo(5123));
    }

    [Test]
    public void Wenn_genau_ein_Minus_zwischen_Optionen_dann_Auswahl_ueber_stdin()
    {
        var ergebnis = Aufrufleser.Lesen(["--quiet", "-", "--kein-browser"]);

        var startauftrag = GueltigerStartauftrag(ergebnis);
        Assert.That(startauftrag.Auswahl.Art, Is.EqualTo(Auswahlart.Stdin));
        Assert.That(startauftrag.BrowserOeffnen, Is.False);
    }

    [TestCase("-", HashA)]
    [TestCase(HashA, "-")]
    [TestCase("-", "main..feature")]
    [TestCase("main..feature", "-")]
    [TestCase("-", "-")]
    public void Wenn_Minus_neben_einem_weiteren_Auswahlargument_dann_Fehler(string erstes, string zweites)
    {
        var ergebnis = Aufrufleser.Lesen([erstes, zweites]);

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Fehlermeldung, Does.Contain("-"));
        Assert.That(ergebnis.Fehlermeldung, Does.Contain("stdin"));
    }

    [TestCase("a1b2..c3d4", HashC)]
    [TestCase(HashC, "a1b2..c3d4")]
    public void Wenn_Bereich_neben_Einzelhash_dann_Fehler(string erstes, string zweites)
    {
        var ergebnis = Aufrufleser.Lesen([erstes, zweites]);

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Fehlermeldung, Does.Contain("nur Bereiche"));
    }

    [TestCase("--output=pwn..HEAD")]
    [TestCase("a1b2...c3d4")]
    [TestCase("HEAD@{1}..HEAD")]
    [TestCase("..")]
    public void Wenn_Bereich_unzulaessig_dann_Fehler_mit_der_erwarteten_Form(string bereich)
    {
        var ergebnis = Aufrufleser.Lesen(["main..feature", bereich]);

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Fehlermeldung, Does.Contain("Argument 2"));
        Assert.That(ergebnis.Fehlermeldung, Does.Contain("<von>..<bis>"));
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

    [Test]
    public void Wenn_ignore_mehrfach_dann_Muster_in_Aufrufreihenfolge()
    {
        var ergebnis = Aufrufleser.Lesen([HashA, "--ignore", "*.lock", "--ignore", "build/**", "--ignore", " a "]);

        var startauftrag = GueltigerStartauftrag(ergebnis);
        Assert.That(startauftrag.Muster.AlsArray(), Is.EqualTo(new[] { "*.lock", "build/**", " a " }));
    }

    [Test]
    public void Wenn_kein_ignore_dann_leere_Musterliste()
    {
        var ergebnis = Aufrufleser.Lesen([HashA]);

        Assert.That(GueltigerStartauftrag(ergebnis).Muster.Anzahl, Is.EqualTo(0));
    }

    [Test]
    public void Wenn_ignore_ohne_Wert_dann_Fehler()
    {
        var ergebnis = Aufrufleser.Lesen([HashA, "--ignore"]);

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Fehlermeldung, Does.Contain("--ignore"));
    }

    [TestCase("")]
    [TestCase("   ")]
    [TestCase("\n")]
    [TestCase("a\u202Eb")]
    public void Wenn_ignore_Muster_ungueltig_dann_Fehler(string muster)
    {
        var ergebnis = Aufrufleser.Lesen([HashA, "--ignore", muster]);

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Fehlermeldung, Is.Not.Empty);
    }

    [Test]
    public void Wenn_ignore_Muster_ueber_200_Zeichen_dann_Fehler()
    {
        var ergebnis = Aufrufleser.Lesen([HashA, "--ignore", new string('a', 201)]);

        Assert.That(ergebnis.IstGueltig, Is.False);
    }

    [Test]
    public void Wenn_21_Muster_dann_Fehler()
    {
        var ergebnis = Aufrufleser.Lesen(MitMustern(HashA, 21));

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Fehlermeldung, Does.Contain("20"));
    }

    [Test]
    public void Wenn_20_Muster_dann_gueltig()
    {
        var ergebnis = Aufrufleser.Lesen(MitMustern(HashA, 20));

        Assert.That(GueltigerStartauftrag(ergebnis).Muster.Anzahl, Is.EqualTo(20));
    }

    private static string[] MitMustern(string hash, int anzahl)
    {
        var argumente = new List<string> { hash };
        for (var i = 0; i < anzahl; i++)
        {
            argumente.Add("--ignore");
            argumente.Add("*.lock");
        }
        return argumente.ToArray();
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
