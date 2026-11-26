using GitReviewA.Dateiansicht;

namespace GitReviewA.Tests.Dateiansicht;

/// <summary>
/// R00043 Kriterium 17 und NFA (B4209): die eine Buchung der gelesenen Bytes — je Datei die Einzelgrenze, zusammen 32 MiB, das
/// Lesen endet beim Überschreiten; und die Zahl der nur gekürzt gezeigten Zeilen ohne Liste von Strings (G7).
/// </summary>
public class QuellenbuchungTests
{
    [Test]
    public void Wenn_nichts_gebucht_ist_dann_liest_der_naechste_Vorgang_Einzelgrenze_plus_ein_Byte()
    {
        var buchung = new Quellenbuchung(hoechstsumme: 200);

        Assert.That(buchung.Lesehoechstmenge(100), Is.EqualTo(101));
    }

    [Test]
    public void Wenn_die_Summe_fast_erreicht_ist_dann_begrenzt_sie_die_Lesemenge()
    {
        var buchung = new Quellenbuchung(hoechstsumme: 200);
        Assert.That(buchung.Buchen(150), Is.True);

        Assert.That(buchung.Verbleibend, Is.EqualTo(50));
        Assert.That(buchung.Lesehoechstmenge(100), Is.EqualTo(51));
    }

    [Test]
    public void Wenn_die_Summe_ueberschritten_wird_dann_meldet_das_Buchen_false()
    {
        var buchung = new Quellenbuchung(hoechstsumme: 200);

        Assert.That(buchung.Buchen(200), Is.True);
        Assert.That(buchung.Buchen(1), Is.False);
        Assert.That(buchung.Gebucht, Is.EqualTo(201));
        Assert.That(buchung.Verbleibend, Is.EqualTo(0));
        Assert.That(buchung.Lesehoechstmenge(100), Is.EqualTo(1));
    }

    [Test]
    public void Wenn_keine_Summe_gewaehlt_ist_dann_gilt_die_Standardgrenze_von_32_MiB()
    {
        var buchung = new Quellenbuchung();

        Assert.That(buchung.Hoechstsumme, Is.EqualTo(32L * 1024 * 1024));
    }

    [TestCase("x", 0)]
    [TestCase("xxxxxxxxxx", 0)]
    public void Wenn_eine_Zeile_kurz_ist_dann_gilt_sie_nicht_als_gekuerzt(string zeile, int erwartet)
    {
        Assert.That(GekuerzteZeilen(zeile), Is.EqualTo(erwartet));
    }

    [Test]
    public void Wenn_eine_Zeile_10001_Zeichen_hat_dann_gilt_sie_als_gekuerzt()
    {
        Assert.That(GekuerzteZeilen(new string('x', 10001)), Is.EqualTo(1));
        Assert.That(GekuerzteZeilen(new string('x', 10000)), Is.EqualTo(0));
    }

    [Test]
    public void Wenn_eine_CRLF_Zeile_10000_Zeichen_hat_dann_zaehlt_das_CR_nicht_zur_Laenge()
    {
        Assert.That(GekuerzteZeilen(new string('x', 10000) + "\r\n"), Is.EqualTo(0));
        Assert.That(GekuerzteZeilen(new string('x', 10001) + "\r\n"), Is.EqualTo(1));
    }

    [Test]
    public void Wenn_viele_Zeilen_so_stehen_dann_zaehlt_die_Stelle_ohne_Liste_von_Strings()
    {
        var viele = string.Concat(Enumerable.Repeat("x\n", 300_000));

        Assert.That(GekuerzteZeilen(viele), Is.EqualTo(0));
    }

    private static int GekuerzteZeilen(string text)
    {
        var eintrag = new Dateieintrag(0, "a.sql", "a.sql", "/tmp/a.sql", "/tmp/a.sql", new Dateitext(text, text.Length, Kodierung.Utf8, Zeilenende.Lf, 1));
        return eintrag.GekuerzteZeilen;
    }
}