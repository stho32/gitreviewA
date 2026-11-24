using System.Text.RegularExpressions;
using GitReviewA.Protokoll;

namespace GitReviewA.Tests.Protokoll;

public class ProtokollzeileTests
{
    [Test]
    public void Wenn_Zeile_formatiert_dann_Zeit_Stufe_Kontext_und_Meldung()
    {
        var zeit = new DateTimeOffset(2026, 11, 24, 9, 5, 7, 42, TimeSpan.FromHours(1));

        var zeile = Protokollzeile.Formatiere(zeit, Protokollstufe.Information, "Start", "gitreviewA läuft auf http://127.0.0.1:5000/");

        Assert.That(zeile, Is.EqualTo("2026-11-24T09:05:07.042+01:00 INFO [Start] gitreviewA läuft auf http://127.0.0.1:5000/"));
    }

    [Test]
    public void Wenn_Meldung_Zeilenumbrueche_enthaelt_dann_bleibt_der_Eintrag_eine_Zeile()
    {
        var zeit = new DateTimeOffset(2026, 11, 24, 9, 5, 7, TimeSpan.Zero);

        var zeile = Protokollzeile.Formatiere(zeit, Protokollstufe.Fehler, "Server", "erste\r\nzweite\ndritte");

        Assert.That(zeile, Is.EqualTo("2026-11-24T09:05:07.000+00:00 FEHLER [Server] erste / zweite / dritte"));
    }

    [TestCase(@"a\u001b[2Jb", "a⟨U+001B⟩[2Jb")]
    [TestCase(@"a\u001b]0;Titel\u0007b", "a⟨U+001B⟩]0;Titel⟨U+0007⟩b")]
    [TestCase(@"a\u009b31mb", "a⟨U+009B⟩31mb")]
    [TestCase(@"a\u0000b\u007fc", "a⟨U+0000⟩b⟨U+007F⟩c")]
    [TestCase(@"a\u202eb\u2066c\u200fd", "a⟨U+202E⟩b⟨U+2066⟩c⟨U+200F⟩d")]
    [TestCase(@"a\u200Bb\uFEFFc\uDB40\uDC41d", "a⟨U+200B⟩b⟨U+FEFF⟩c⟨U+E0041⟩d")]
    [TestCase(@"a\tb ä", "a\tb ä")]
    public void Wenn_Meldung_Steuer_oder_Richtungszeichen_aus_fremden_Namen_enthaelt_dann_stehen_sie_als_Marke_im_Protokoll(string maskierteMeldung, string erwartet)
    {
        var zeit = new DateTimeOffset(2026, 11, 24, 9, 5, 7, TimeSpan.Zero);
        var meldung = Regex.Unescape(maskierteMeldung);

        var zeile = Protokollzeile.Formatiere(zeit, Protokollstufe.Debug, "Anfrage", meldung);

        Assert.That(zeile, Is.EqualTo($"2026-11-24T09:05:07.000+00:00 DEBUG [Anfrage] {erwartet}"));
    }
}
