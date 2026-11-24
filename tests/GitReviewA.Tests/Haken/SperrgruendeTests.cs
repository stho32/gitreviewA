using GitReviewA.Diff;
using GitReviewA.Haken;

namespace GitReviewA.Tests.Haken;

public class SperrgruendeTests
{
    [Test]
    public void Wenn_der_Name_lesbar_ist_dann_kein_Sperrgrund()
    {
        var grund = Sperrgruende.Aus(Namensfall.Lesbar);

        Assert.That(grund, Is.Empty);
    }

    [Test]
    public void Wenn_mehrere_Dateien_den_Namen_tragen_dann_Name_nicht_eindeutig()
    {
        var grund = Sperrgruende.Aus(Namensfall.NichtEindeutig);

        Assert.That(grund, Is.EqualTo("Diff nicht lesbar: Name nicht eindeutig"));
    }

    [Test]
    public void Wenn_sich_der_Name_nicht_an_git_geben_laesst_dann_Name_nicht_uebergebbar()
    {
        var grund = Sperrgruende.Aus(Namensfall.NichtUebergebbar);

        Assert.That(grund, Is.EqualTo("Diff nicht lesbar: Name nicht übergebbar"));
    }

    [Test]
    public void Wenn_der_Name_im_Commit_nicht_vorkommt_dann_gibt_es_keine_Stelle_und_keinen_Grund()
    {
        Assert.Throws<InvalidOperationException>(() => Sperrgruende.Aus(Namensfall.NichtGefunden));
    }
}
