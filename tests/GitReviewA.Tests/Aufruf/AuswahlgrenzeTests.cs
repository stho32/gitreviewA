using GitReviewA.Aufruf;

namespace GitReviewA.Tests.Aufruf;

public class AuswahlgrenzeTests
{
    [TestCase(1)]
    [TestCase(200)]
    public void Wenn_hoechstens_200_Commits_dann_zulaessig_ohne_Warnung(int anzahl)
    {
        var urteil = Auswahlgrenze.Pruefe(anzahl);

        Assert.That(urteil, Is.EqualTo(Auswahlurteil.Zulaessig));
    }

    [TestCase(201)]
    [TestCase(1000)]
    public void Wenn_201_bis_1000_Commits_dann_zulaessig_mit_Warnung(int anzahl)
    {
        var urteil = Auswahlgrenze.Pruefe(anzahl);

        Assert.That(urteil, Is.EqualTo(Auswahlurteil.MitWarnung));
    }

    [TestCase(1001)]
    [TestCase(50000)]
    public void Wenn_mehr_als_1000_Commits_dann_abgelehnt(int anzahl)
    {
        var urteil = Auswahlgrenze.Pruefe(anzahl);

        Assert.That(urteil, Is.EqualTo(Auswahlurteil.Abgelehnt));
    }

    [Test]
    public void Wenn_abgelehnt_dann_nennt_die_Meldung_die_Grenze_1_000()
    {
        var meldung = Auswahlgrenze.Ablehnungsmeldung();

        Assert.That(meldung, Does.Contain("1 000"));
    }

    [Test]
    public void Wenn_Warnung_dann_nennt_die_Meldung_Anzahl_und_Schwelle()
    {
        var meldung = Auswahlgrenze.Warnmeldung(1000);

        Assert.That(meldung, Does.Contain("1 000 Commits"));
        Assert.That(meldung, Does.Contain("201"));
    }
}
