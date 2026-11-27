using System.Text.RegularExpressions;
using GitReviewA.Fremdtext;

namespace GitReviewA.Tests.Fremdtext;

/// <summary>Klasse statt Beispiel: Steuerzeichen außer Tab, alle Formatzeichen (Richtung, Nullbreiten, BOM, Tags), Zeilen- und Absatztrenner,
/// die standardmäßig unsichtbaren Zeichen außerhalb der Formatzeichen (Variationsselektoren, Hangul-Füller, reservierte Tag-Bereiche) und einzelne Surrogate.</summary>
public class UnsichtbareZeichenTests
{
    [TestCase(@"a\u001Bb", "a⟨U+001B⟩b")]
    [TestCase(@"a\u009Bb", "a⟨U+009B⟩b")]
    [TestCase(@"a‮b", "a⟨U+202E⟩b")]
    [TestCase(@"a⁦b", "a⟨U+2066⟩b")]
    [TestCase(@"a؜b", "a⟨U+061C⟩b")]
    [TestCase(@"a‎b", "a⟨U+200E⟩b")]
    [TestCase(@"a​b", "a⟨U+200B⟩b")]
    [TestCase(@"a‍b", "a⟨U+200D⟩b")]
    [TestCase(@"a⁠b", "a⟨U+2060⟩b")]
    [TestCase(@"a­b", "a⟨U+00AD⟩b")]
    [TestCase(@"a﻿b", "a⟨U+FEFF⟩b")]
    [TestCase(@"a b c", "a⟨U+2028⟩b⟨U+2029⟩c")]
    [TestCase(@"a󠁁b", "a⟨U+E0041⟩b")]
    [TestCase(@"a󠁿b", "a⟨U+E007F⟩b")]
    [TestCase(@"a\uD800b", "a⟨U+D800⟩b")]
    [TestCase(@"a\uDC00", "a⟨U+DC00⟩")]
    public void Wenn_Text_ein_unsichtbares_Zeichen_enthaelt_dann_steht_es_als_Marke(string maskiert, string erwartet)
    {
        var markiert = UnsichtbareZeichen.AlsMarken(Regex.Unescape(maskiert));

        Assert.That(markiert, Is.EqualTo(erwartet));
    }

    [TestCase("a\tb ä ß ≥ <b>")]
    [TestCase("\U0001F600 Emoji")]
    [TestCase("日本語/ملف.txt")]
    [TestCase("안녕하세요")]
    [TestCase("안녕하세요.txt")]
    [TestCase("\u110B\u1161\u11AB\u1102\u1167\u11BC\u1112\u1161\u1109\u1166\u110B\u1169.txt")] // NFD: kein Füller
    [TestCase("⠁⠃⠉")]
    public void Wenn_Text_nur_sichtbare_Zeichen_und_Tab_enthaelt_dann_bleibt_er_unveraendert(string text)
    {
        var markiert = UnsichtbareZeichen.AlsMarken(text);

        Assert.That(markiert, Is.EqualTo(text));
    }

    /// <summary>Legitime Inhalte der User Story R00058 (Kriterium 5): nur der unsichtbare Teil wird markiert, der Rest bleibt.</summary>
    [TestCase(@"Gut ❤\uFE0F 👨\u200D👩\u200D👧 😀", @"Gut ❤⟨U+FE0F⟩ 👨⟨U+200D⟩👩⟨U+200D⟩👧 😀")]
    [TestCase(@"a\u2800b", @"a⟨U+2800⟩b")]
    public void Wenn_Text_Emoji_oder_Braille_traegt_dann_steht_nur_das_Unsichtbare_als_Marke(string maskiert, string erwartet)
    {
        var markiert = UnsichtbareZeichen.AlsMarken(Regex.Unescape(maskiert));

        Assert.That(markiert, Is.EqualTo(erwartet));
    }

    /// <summary>Die Bereiche außerhalb der Unicode-Kategorien, mit ihren Grenzen (R00058).</summary>
    [TestCase(0x034F)]
    [TestCase(0x115F)]
    [TestCase(0x1160)]
    [TestCase(0x17B4)]
    [TestCase(0x17B5)]
    [TestCase(0x180B)]
    [TestCase(0x180D)]
    [TestCase(0x180F)]
    [TestCase(0x2065)]
    [TestCase(0x2800)]
    [TestCase(0x3164)]
    [TestCase(0xFE00)]
    [TestCase(0xFE0F)]
    [TestCase(0xFFA0)]
    [TestCase(0xFFF0)]
    [TestCase(0xFFF8)]
    [TestCase(0xE0000)]
    [TestCase(0xE0002)]
    [TestCase(0xE001F)]
    [TestCase(0xE0080)]
    [TestCase(0xE0FFF)]
    public void Wenn_Text_ein_standardmaessig_unsichtbares_Zeichen_traegt_dann_steht_es_als_Marke(int codepunkt)
    {
        var markiert = UnsichtbareZeichen.AlsMarken($"a{char.ConvertFromUtf32(codepunkt)}b");

        Assert.That(markiert, Is.EqualTo($"a⟨U+{codepunkt:X4}⟩b"));
    }

    /// <summary>Je ein Zeichen knapp neben den Bereichen bleibt sichtbar (R00058, Kriterium 2).</summary>
    [TestCase(0x034E)]
    [TestCase(0x1161)]
    [TestCase(0x180A)]
    [TestCase(0x1810)]
    [TestCase(0x2801)]
    [TestCase(0x3163)]
    [TestCase(0xFE10)]
    [TestCase(0xE1000)]
    public void Wenn_Text_nur_ein_Nachbarzeichen_traegt_dann_bleibt_er_unveraendert(int codepunkt)
    {
        var text = char.ConvertFromUtf32(codepunkt);

        var markiert = UnsichtbareZeichen.AlsMarken(text);

        Assert.That(markiert, Is.EqualTo(text));
    }
}
