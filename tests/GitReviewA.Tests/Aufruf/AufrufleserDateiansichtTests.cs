using GitReviewA.Aufruf;
using GitReviewA.Protokoll;

namespace GitReviewA.Tests.Aufruf;

/// <summary>R00043 Kriterium 2 und 7: die Laufart entsteht im Aufrufleser, Review und Dateiansicht schließen sich aus.</summary>
public class AufrufleserDateiansichtTests
{
    private const string HashA = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";

    [Test]
    public void Wenn_dateien_mit_einer_Angabe_dann_Laufart_Dateiansicht_mit_Standardwerten()
    {
        var ergebnis = Aufrufleser.Lesen(["--dateien", "a.sql"]);

        var dateiaufruf = GueltigerDateiaufruf(ergebnis);
        Assert.That(ergebnis.Laufart, Is.EqualTo(Laufart.Dateiansicht));
        Assert.That(dateiaufruf.Quellen, Is.EqualTo(new[] { "a.sql" }));
        Assert.That(dateiaufruf.Port, Is.EqualTo(Aufrufleser.FreierPort));
        Assert.That(dateiaufruf.BrowserOeffnen, Is.True);
        Assert.That(dateiaufruf.Mindeststufe, Is.EqualTo(Protokollstufe.Warnung));
    }

    [Test]
    public void Wenn_Optionen_vor_und_nach_der_Angabe_stehen_dann_gelten_sie()
    {
        var ergebnis = Aufrufleser.Lesen(["--kein-browser", "--dateien", "a.sql", "--port", "5123", "--verbose"]);

        var dateiaufruf = GueltigerDateiaufruf(ergebnis);
        Assert.That(dateiaufruf.Quellen, Is.EqualTo(new[] { "a.sql" }));
        Assert.That(dateiaufruf.Port, Is.EqualTo(5123));
        Assert.That(dateiaufruf.BrowserOeffnen, Is.False);
        Assert.That(dateiaufruf.Mindeststufe, Is.EqualTo(Protokollstufe.Debug));
    }

    [Test]
    public void Wenn_dateien_allein_dann_Fehler_ohne_Server()
    {
        var ergebnis = Aufrufleser.Lesen(["--dateien"]);

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Fehlermeldung, Does.Contain("braucht eine Angabe"));
    }

    [Test]
    public void Wenn_zwei_Angaben_dann_Fehler_Die_Dateiansicht_zeigt_eine_Datei()
    {
        var ergebnis = Aufrufleser.Lesen(["--dateien", "a.sql", "b.sql"]);

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Fehlermeldung, Does.Contain("Die Dateiansicht zeigt eine Datei"));
    }

    [TestCase("a1b2c3d4")]
    [TestCase(HashA)]
    [TestCase("main..feature")]
    [TestCase("a..b.sql")]
    [TestCase("-")]
    public void Wenn_dateien_mit_einem_Hash_Bereich_oder_stdin_dann_Review_oder_Dateiansicht_nicht_beides(string reviewArgument)
    {
        var ergebnis = Aufrufleser.Lesen(["--dateien", "a.sql", reviewArgument]);

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Fehlermeldung, Does.Contain("Review oder Dateiansicht, nicht beides"));
    }

    [Test]
    public void Wenn_dateien_mit_ignore_dann_Review_oder_Dateiansicht_nicht_beides()
    {
        var ergebnis = Aufrufleser.Lesen(["--dateien", "a.sql", "--ignore", "*.md"]);

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Fehlermeldung, Does.Contain("Review oder Dateiansicht, nicht beides"));
    }

    [Test]
    public void Wenn_Hash_vor_dateien_steht_dann_Review_oder_Dateiansicht_nicht_beides()
    {
        var ergebnis = Aufrufleser.Lesen([HashA, "--dateien", "a.sql"]);

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Fehlermeldung, Does.Contain("Review oder Dateiansicht, nicht beides"));
    }

    [Test]
    public void Wenn_nach_Doppelstrich_eine_Datei_mit_Minus_beginnt_dann_ist_sie_die_Angabe()
    {
        var ergebnis = Aufrufleser.Lesen(["--dateien", "--", "-x.sql"]);

        Assert.That(GueltigerDateiaufruf(ergebnis).Quellen, Is.EqualTo(new[] { "-x.sql" }));
    }

    [Test]
    public void Wenn_dateien_mit_Minus_ohne_Doppelstrich_dann_Review_oder_Dateiansicht_nicht_beides()
    {
        var ergebnis = Aufrufleser.Lesen(["--dateien", "-"]);

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Fehlermeldung, Does.Contain("Review oder Dateiansicht, nicht beides"));
    }

    [TestCase("-x.sql")]
    [TestCase("--unbekannt")]
    [TestCase("--dateien=a.sql")]
    public void Wenn_dateien_eine_unbekannte_Option_nennt_dann_Fehler_mit_dem_Ausweg_ueber_den_Doppelstrich(string argument)
    {
        var ergebnis = Aufrufleser.Lesen(["--dateien", argument]);

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Fehlermeldung, Does.Contain("unbekannte Option"));
        Assert.That(ergebnis.Fehlermeldung, Does.Contain("--dateien --"));
    }

    [TestCase("unter/../a.sql")]
    [TestCase("ordnerlink/a.sql")]
    [TestCase("*.sql")]
    public void Wenn_die_Angabe_wie_ein_Pfad_aussieht_dann_wird_sie_woertlich_genommen(string angabe)
    {
        var ergebnis = Aufrufleser.Lesen(["--dateien", angabe]);

        Assert.That(GueltigerDateiaufruf(ergebnis).Quellen, Is.EqualTo(new[] { angabe }));
    }

    [Test]
    public void Wenn_dateien_mit_Gleichheitszeichen_dann_kein_Dateiaufruf()
    {
        var ergebnis = Aufrufleser.Lesen(["--dateien=a.sql"]);

        Assert.That(ergebnis.IstGueltig, Is.False);
    }

    [Test]
    public void Wenn_dateien_ohne_Portwert_dann_Fehler()
    {
        var ergebnis = Aufrufleser.Lesen(["--dateien", "a.sql", "--port"]);

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Fehlermeldung, Does.Contain("--port"));
    }

    [Test]
    public void Wenn_review_ohne_dateien_dann_bleibt_die_Laufart_Review()
    {
        var ergebnis = Aufrufleser.Lesen([HashA, "--kein-browser"]);

        Assert.That(ergebnis.IstGueltig, Is.True);
        Assert.That(ergebnis.Laufart, Is.EqualTo(Laufart.Review));
        Assert.That(ergebnis.Dateiaufruf, Is.Null);
        Assert.That(ergebnis.Startauftrag?.Auswahl.Hashes.Anzahl, Is.EqualTo(1));
    }

    [Test]
    public void Wenn_verbose_und_quiet_dann_Fehler_auch_in_der_Dateiansicht()
    {
        var ergebnis = Aufrufleser.Lesen(["--dateien", "a.sql", "--verbose", "--quiet"]);

        Assert.That(ergebnis.IstGueltig, Is.False);
    }

    private static Dateiaufruf GueltigerDateiaufruf(Aufrufergebnis ergebnis)
    {
        if (ergebnis.IstGueltig)
        {
            return ergebnis.Dateiaufruf ?? throw new InvalidOperationException("gültig ohne Dateiaufruf");
        }
        Assert.Fail(ergebnis.Fehlermeldung);
        throw new InvalidOperationException("nicht erreichbar");
    }
}