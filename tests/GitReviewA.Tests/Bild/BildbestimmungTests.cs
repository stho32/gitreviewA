using System.Text;
using GitReviewA.Bild;

namespace GitReviewA.Tests.Bild;

internal sealed class BildbestimmungTests
{
    private static readonly byte[] PngAnfang = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00];

    [Test]
    public void Wenn_Png_anfang_dann_Png()
    {
        Assert.That(Bildbestimmung.Art(PngAnfang), Is.EqualTo(Bildart.Png));
    }

    [Test]
    public void Wenn_Jpeg_anfang_dann_Jpeg()
    {
        Assert.That(Bildbestimmung.Art([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]), Is.EqualTo(Bildart.Jpeg));
    }

    [Test]
    public void Wenn_Gif87a_oder_Gif89a_dann_Gif()
    {
        Assert.That(Bildbestimmung.Art(Encoding.ASCII.GetBytes("GIF87a")), Is.EqualTo(Bildart.Gif));
        Assert.That(Bildbestimmung.Art(Encoding.ASCII.GetBytes("GIF89a")), Is.EqualTo(Bildart.Gif));
    }

    [Test]
    public void Wenn_Riff_mit_Webp_an_Offset_8_dann_Webp()
    {
        var webp = Anhaengen(Encoding.ASCII.GetBytes("RIFF"), [0x1A, 0x00, 0x00, 0x00], Encoding.ASCII.GetBytes("WEBPVP8 "));

        Assert.That(Bildbestimmung.Art(webp), Is.EqualTo(Bildart.Webp));
    }

    [Test]
    public void Wenn_Riff_ohne_Webp_dann_kein_Bild()
    {
        var wav = Anhaengen(Encoding.ASCII.GetBytes("RIFF"), [0x24, 0x00, 0x00, 0x00], Encoding.ASCII.GetBytes("WAVEfmt "));

        Assert.That(Bildbestimmung.Art(wav), Is.Null);
    }

    [Test]
    public void Wenn_Svg_Text_dann_kein_Bild()
    {
        var svg = Encoding.UTF8.GetBytes("<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>\n");

        Assert.That(Bildbestimmung.Art(svg), Is.Null);
    }

    [Test]
    public void Wenn_Textinhalt_dann_kein_Bild()
    {
        Assert.That(Bildbestimmung.Art(Encoding.UTF8.GetBytes("nur Text\n")), Is.Null);
    }

    [Test]
    public void Wenn_leer_oder_abgeschnittene_Kennung_dann_kein_Bild()
    {
        Assert.That(Bildbestimmung.Art([]), Is.Null);
        Assert.That(Bildbestimmung.Art([0x89, 0x50]), Is.Null);
        Assert.That(Bildbestimmung.Art([0xFF, 0xD8]), Is.Null);
        Assert.That(Bildbestimmung.Art(Encoding.ASCII.GetBytes("GIF")), Is.Null);
    }

    private static byte[] Anhaengen(params byte[][] teile)
    {
        return teile.SelectMany(teil => teil).ToArray();
    }
}
