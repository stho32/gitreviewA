using GitReviewA.Protokoll;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Protokoll;

public class StderrProtokollTests
{
    private static readonly DateTimeOffset Jetzt = new(2026, 11, 24, 9, 0, 0, TimeSpan.FromHours(1));

    [Test]
    public void Wenn_Standardstufe_dann_Startzeile_und_Warnung_aber_kein_Debug_und_keine_Information()
    {
        var ziel = new StringWriter();
        var protokoll = new StderrProtokoll(ziel, new TestUhr(Jetzt), Protokollstufe.Warnung);

        protokoll.Melde(Protokollstufe.Debug, "Anfrage", "GET /");
        protokoll.Melde(Protokollstufe.Information, "Server", "bereit");
        protokoll.MeldeStart("http://127.0.0.1:5000/");
        protokoll.Melde(Protokollstufe.Warnung, "Browser", "ließ sich nicht öffnen");

        Assert.That(Zeilen(ziel), Is.EqualTo(new[]
        {
            "2026-11-24T09:00:00.000+01:00 INFO [Start] gitreviewA läuft auf http://127.0.0.1:5000/",
            "2026-11-24T09:00:00.000+01:00 WARNUNG [Browser] ließ sich nicht öffnen",
        }));
    }

    [Test]
    public void Wenn_quiet_dann_nur_Fehler_und_keine_Startzeile()
    {
        var ziel = new StringWriter();
        var protokoll = new StderrProtokoll(ziel, new TestUhr(Jetzt), Protokollstufe.Fehler);

        protokoll.MeldeStart("http://127.0.0.1:5000/");
        protokoll.Melde(Protokollstufe.Warnung, "Browser", "ließ sich nicht öffnen");
        protokoll.Melde(Protokollstufe.Fehler, "git", "gescheitert");

        Assert.That(Zeilen(ziel), Is.EqualTo(new[] { "2026-11-24T09:00:00.000+01:00 FEHLER [git] gescheitert" }));
    }

    [Test]
    public void Wenn_verbose_dann_auch_Debug()
    {
        var ziel = new StringWriter();
        var protokoll = new StderrProtokoll(ziel, new TestUhr(Jetzt), Protokollstufe.Debug);

        protokoll.Melde(Protokollstufe.Debug, "Anfrage", "GET /api/commits");

        Assert.That(Zeilen(ziel), Is.EqualTo(new[] { "2026-11-24T09:00:00.000+01:00 DEBUG [Anfrage] GET /api/commits" }));
    }

    private static string[] Zeilen(StringWriter ziel)
    {
        return ziel.ToString().Split(Environment.NewLine, StringSplitOptions.RemoveEmptyEntries);
    }
}
