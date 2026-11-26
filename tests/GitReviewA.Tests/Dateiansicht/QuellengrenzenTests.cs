using GitReviewA.Dateiansicht;

namespace GitReviewA.Tests.Dateiansicht;

/// <summary>
/// R00045 Kriterium 3 (Unit, Grenzen): höchstens 50 Angaben und 32 MiB zusammen — genau am Limit läuft es, ein Schritt
/// darüber endet mit einer Meldung. Eine Stelle für die Werte, eine Stelle für den Wortlaut.
/// </summary>
public class QuellengrenzenTests
{
    [Test]
    public void Wenn_50_Angaben_genannt_sind_dann_keine_Meldung()
    {
        Assert.That(Quellengrenzen.Zahlmeldung(50), Is.Null);
    }

    [Test]
    public void Wenn_51_Angaben_genannt_sind_dann_zu_viele_Dateien_mit_der_Zahl()
    {
        Assert.That(Quellengrenzen.Zahlmeldung(51), Is.EqualTo("zu viele Dateien (51, höchstens 50)"));
    }

    [Test]
    public void Wenn_200_Angaben_genannt_sind_dann_nennt_die_Meldung_200()
    {
        Assert.That(Quellengrenzen.Zahlmeldung(200), Is.EqualTo("zu viele Dateien (200, höchstens 50)"));
    }

    [Test]
    public void Wenn_die_Summe_genau_32_MiB_ist_dann_nicht_ueberschritten()
    {
        Assert.That(Quellengrenzen.SummeUeberschritten(33_554_432), Is.False);
    }

    [Test]
    public void Wenn_die_Summe_ein_Byte_ueber_32_MiB_ist_dann_ueberschritten()
    {
        Assert.That(Quellengrenzen.SummeUeberschritten(33_554_433), Is.True);
    }

    [Test]
    public void Wenn_die_Hoechstsumme_die_Standardgrenze_der_Buchung_ist_dann_ein_Wert()
    {
        Assert.That(Quellengrenzen.Hoechstsumme, Is.EqualTo(32L * 1024 * 1024));
        Assert.That(Quellenbuchung.StandardSumme, Is.EqualTo(Quellengrenzen.Hoechstsumme));
    }
}
