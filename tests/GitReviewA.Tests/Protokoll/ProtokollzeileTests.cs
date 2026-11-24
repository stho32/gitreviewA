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
}
