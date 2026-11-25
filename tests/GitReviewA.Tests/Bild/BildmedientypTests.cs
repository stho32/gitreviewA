using GitReviewA.Bild;

namespace GitReviewA.Tests.Bild;

internal sealed class BildmedientypTests
{
    [Test]
    public void Wenn_Bildart_dann_fester_Medientyp()
    {
        Assert.That(Bildmedientyp.Fuer(Bildart.Png), Is.EqualTo("image/png"));
        Assert.That(Bildmedientyp.Fuer(Bildart.Jpeg), Is.EqualTo("image/jpeg"));
        Assert.That(Bildmedientyp.Fuer(Bildart.Gif), Is.EqualTo("image/gif"));
        Assert.That(Bildmedientyp.Fuer(Bildart.Webp), Is.EqualTo("image/webp"));
    }
}
