using GitReviewA.Beenden;

namespace GitReviewA.Tests.Beenden;

public class AbbruchEntscheidungTests
{
    [Test]
    public void Wenn_Beenden_angenommen_dann_Ergebnis_ausgeben_und_Exit_0_auch_wenn_danach_ein_Abbruchsignal_kam()
    {
        var ausgang = AbbruchEntscheidung.Entscheide(istBeendenAngenommen: true);

        Assert.That(ausgang, Is.EqualTo(new Laufausgang(IstAbgebrochen: false, ExitCode: 0)));
    }

    [Test]
    public void Wenn_der_Lauf_ohne_angenommenes_Beenden_endet_dann_abgebrochen_ohne_Ergebnis_und_Exit_130()
    {
        var ausgang = AbbruchEntscheidung.Entscheide(istBeendenAngenommen: false);

        Assert.That(ausgang, Is.EqualTo(new Laufausgang(IstAbgebrochen: true, ExitCode: 130)));
    }
}
