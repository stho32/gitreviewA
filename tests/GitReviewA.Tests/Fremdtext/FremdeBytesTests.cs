using System.Text;
using GitReviewA.Fremdtext;

namespace GitReviewA.Tests.Fremdtext;

public class FremdeBytesTests
{
    [TestCase(new byte[] { 0x66, 0xFF, 0x2E }, "f⟨0xFF⟩.")]
    [TestCase(new byte[] { 0x66, 0xFE, 0x2E }, "f⟨0xFE⟩.")]
    [TestCase(new byte[] { 0xE2, 0x82, 0x61 }, "⟨0xE2⟩⟨0x82⟩a")]
    [TestCase(new byte[] { 0xC3, 0xA4, 0xE2, 0x82, 0xAC, 0xEF, 0xBF, 0xBD }, "ä€�")]
    [TestCase(new byte[] { 0xC0, 0xAF }, "⟨0xC0⟩⟨0xAF⟩")]
    [TestCase(new byte[] { 0xED, 0xA0, 0x80 }, "⟨0xED⟩⟨0xA0⟩⟨0x80⟩")]
    public void Wenn_Bytes_dekodiert_werden_dann_steht_jedes_ungueltige_Byte_als_Marke_und_gueltiges_UTF_8_bleibt(byte[] bytes, string erwartet)
    {
        var text = FremdeBytes.Utf8MitBytemarken.GetString(bytes);

        Assert.That(text, Is.EqualTo(erwartet));
    }

    [Test]
    public void Wenn_ein_gueltiges_Zeichen_ueber_die_Puffergrenze_des_Lesers_reicht_dann_bleibt_es_ganz()
    {
        var bytes = new byte[] { 0x61, 0xE2, 0x82, 0xAC, 0xFF, 0x62 };
        using var leser = new StreamReader(new MemoryStream(bytes), FremdeBytes.Utf8MitBytemarken, detectEncodingFromByteOrderMarks: false, bufferSize: 2);

        var text = leser.ReadToEnd();

        Assert.That(text, Is.EqualTo("a€⟨0xFF⟩b"));
    }

    [Test]
    public void Wenn_kodiert_wird_dann_ohne_Byte_Order_Mark()
    {
        var vorspann = FremdeBytes.Utf8MitBytemarken.GetPreamble();

        Assert.That(vorspann, Is.Empty);
        Assert.That(Encoding.UTF8.GetPreamble(), Is.Not.Empty, "Kontrolle: Encoding.UTF8 trägt eine BOM");
    }
}
