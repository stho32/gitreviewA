using System.Text.RegularExpressions;
using GitReviewA.Anmerkungen;

namespace GitReviewA.Tests.Anmerkungen;

/// <summary>Zeichen werden maskiert übergeben (<c>Regex.Unescape</c>): NUnit entdeckt Testfälle mit Steuerzeichen im Argument nicht.</summary>
public class AnmerkungstextTests
{
    private const string SteuerOderRichtung = "Text enthält Steuer- oder Richtungszeichen";

    [TestCase(@"a\u0000b")]
    [TestCase(@"a\u0007b")]
    [TestCase(@"a\u0008b")]
    [TestCase(@"a\u000Bb")]
    [TestCase(@"a\u000Cb")]
    [TestCase(@"a\u000Eb")]
    [TestCase(@"\u001B[31mrot")]
    [TestCase(@"a\u001Fb")]
    [TestCase(@"a\u007Fb")]
    [TestCase(@"a\u0085b")]
    [TestCase(@"\u009B31m")]
    [TestCase(@"a\u009Fb")]
    [TestCase(@"a\u061Cb")]
    [TestCase(@"a\u200Eb")]
    [TestCase(@"a\u200Fb")]
    [TestCase(@"a\u202Ab")]
    [TestCase(@"a\u202Eb")]
    [TestCase(@"a\u2066b")]
    [TestCase(@"a\u2069b")]
    public void Wenn_Steuer_oder_Richtungszeichen_dann_abgelehnt_mit_Grund(string maskiert)
    {
        var text = Regex.Unescape(maskiert);

        var istGueltig = Anmerkungstext.IstGueltig(text, out var grund);

        Assert.That((istGueltig, grund), Is.EqualTo((false, SteuerOderRichtung)));
    }

    [TestCase(@"Tab\tdanach")]
    [TestCase(@"eins\n\nzwei")]
    [TestCase(@"eins\r\nzwei")]
    [TestCase("Prüfen: größer ≥ 3")]
    [TestCase(@"Familie \uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67")]
    [TestCase(@"Zeilentrenner\u2028Absatztrenner\u2029")]
    [TestCase(@"a\u00A0b\u2065c\u206Ad")]
    public void Wenn_Tab_Zeilenumbruch_Umlaut_oder_Emoji_dann_gueltig(string maskiert)
    {
        var text = Regex.Unescape(maskiert);

        var istGueltig = Anmerkungstext.IstGueltig(text, out var grund);

        Assert.That((istGueltig, grund), Is.EqualTo((true, "")));
    }

    [TestCase("")]
    [TestCase("   ")]
    [TestCase(@"\r\n\t")]
    public void Wenn_leer_oder_nur_Leerraum_dann_Text_fehlt(string maskiert)
    {
        var text = Regex.Unescape(maskiert);

        var istGueltig = Anmerkungstext.IstGueltig(text, out var grund);

        Assert.That((istGueltig, grund), Is.EqualTo((false, "Text fehlt")));
    }

    [Test]
    public void Wenn_kein_Text_dann_Text_fehlt()
    {
        var istGueltig = Anmerkungstext.IstGueltig(null, out var grund);

        Assert.That((istGueltig, grund), Is.EqualTo((false, "Text fehlt")));
    }

    [Test]
    public void Wenn_10000_Zeichen_dann_gueltig_und_10001_abgelehnt_mit_Hoechstlaenge()
    {
        var grenze = Anmerkungstext.IstGueltig(new string('x', 10_000), out _);
        var darueber = Anmerkungstext.IstGueltig(new string('x', 10_001), out var grund);

        Assert.That((grenze, darueber, grund), Is.EqualTo((true, false, "Text ist länger als 10000 Zeichen")));
    }
}
