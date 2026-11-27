using GitReviewA.Aufruf;

namespace GitReviewA.Tests.Aufruf;

/// <summary>B2401 — Muster prüfen (R00025): Länge 1 bis 200, keine unsichtbaren Zeichen, höchstens 20 Muster je Lauf.</summary>
public class MusterprueferTests
{
    [TestCase("*.lock")]
    [TestCase("*")]
    [TestCase(" a ")]
    [TestCase("src/**")]
    [TestCase("?")]
    [TestCase("[a-z]")]
    [TestCase("docs/README.md")]
    [TestCase("ä ö.txt")]
    [TestCase("*.lock\t")] // Tab gehört nicht zu den Marken der Oberfläche und bleibt gültig
    [TestCase("*\u2764*")] // ein Emoji ohne Variationsselektor bleibt gültig (R00058, Kriterium 4)
    public void Wenn_Muster_zulaessig_dann_gueltig(string muster)
    {
        var ergebnis = Musterpruefer.Pruefe(muster, 0);

        Assert.That(ergebnis.IstGueltig, Is.True);
        Assert.That(ergebnis.Grund, Is.Null);
    }

    [Test]
    public void Wenn_Muster_genau_200_Zeichen_dann_gueltig()
    {
        var ergebnis = Musterpruefer.Pruefe(new string('a', 200), 0);

        Assert.That(ergebnis.IstGueltig, Is.True);
    }

    [Test]
    public void Wenn_Muster_201_Zeichen_dann_abgelehnt_zu_lang()
    {
        var ergebnis = Musterpruefer.Pruefe(new string('a', 201), 0);

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Grund, Is.EqualTo(Musterablehnungsgrund.ZuLang));
    }

    [TestCase("")]
    [TestCase(" ")]
    [TestCase("   ")]
    [TestCase("\t")]
    public void Wenn_Muster_leer_oder_nur_Leerraum_dann_abgelehnt_leer(string muster)
    {
        var ergebnis = Musterpruefer.Pruefe(muster, 0);

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Grund, Is.EqualTo(Musterablehnungsgrund.Leer));
    }

    [TestCase("\n")]
    [TestCase("a\nb")]
    [TestCase("\r")]
    [TestCase("a\u202Eb")]
    [TestCase("\u200B")]
    [TestCase("a\uFE0Fb")]
    [TestCase("a\u3164b")]
    [TestCase("a\u2800b")]
    [TestCase("a\u034Fb")]
    [TestCase("a\U000E0000b")]
    public void Wenn_Muster_ein_unsichtbares_Zeichen_traegt_dann_abgelehnt(string muster)
    {
        var ergebnis = Musterpruefer.Pruefe(muster, 0);

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Grund, Is.EqualTo(Musterablehnungsgrund.UnsichtbareZeichen));
    }

    [Test]
    public void Wenn_Muster_ein_unsichtbares_Zeichen_traegt_dann_nennt_die_Meldung_den_Grund_woertlich()
    {
        var meldung = Musterpruefer.Meldung(Musterablehnungsgrund.UnsichtbareZeichen);

        Assert.That(meldung, Is.EqualTo("Ein --ignore-Muster darf keine unsichtbaren Zeichen enthalten."));
    }

    [Test]
    public void Wenn_schon_20_Muster_dann_das_naechste_abgelehnt_zu_viele()
    {
        var ergebnis = Musterpruefer.Pruefe("*.lock", Musterpruefer.Hoechstzahl);

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Grund, Is.EqualTo(Musterablehnungsgrund.ZuViele));
    }

    [Test]
    public void Wenn_20_Muster_erreicht_aber_noch_Platz_dann_gueltig()
    {
        var ergebnis = Musterpruefer.Pruefe("*.lock", Musterpruefer.Hoechstzahl - 1);

        Assert.That(ergebnis.IstGueltig, Is.True);
    }

    [Test]
    public void Wenn_Muster_abgelehnt_dann_Meldung_nennt_den_Grund()
    {
        var meldung = Musterpruefer.Meldung(Musterablehnungsgrund.ZuViele);

        Assert.That(meldung, Does.Contain("20"));
        Assert.That(Musterpruefer.Meldung(Musterablehnungsgrund.Leer), Is.Not.Empty);
        Assert.That(Musterpruefer.Meldung(Musterablehnungsgrund.ZuLang), Does.Contain("200"));
        Assert.That(Musterpruefer.Meldung(Musterablehnungsgrund.UnsichtbareZeichen), Is.Not.Empty);
    }
}
