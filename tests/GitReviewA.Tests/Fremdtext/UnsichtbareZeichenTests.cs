using System.Text.RegularExpressions;
using GitReviewA.Fremdtext;

namespace GitReviewA.Tests.Fremdtext;

/// <summary>Klasse statt Beispiel: Steuerzeichen außer Tab, alle Formatzeichen (Richtung, Nullbreiten, BOM, Tags), Zeilen- und Absatztrenner und einzelne Surrogate.</summary>
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
    public void Wenn_Text_nur_sichtbare_Zeichen_und_Tab_enthaelt_dann_bleibt_er_unveraendert(string text)
    {
        var markiert = UnsichtbareZeichen.AlsMarken(text);

        Assert.That(markiert, Is.EqualTo(text));
    }
}
