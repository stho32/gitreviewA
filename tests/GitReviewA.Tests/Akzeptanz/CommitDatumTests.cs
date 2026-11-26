using System.Runtime.Versioning;
using System.Text.Json;
using GitReviewA.Protokoll;
using GitReviewA.Server;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Kriterium 11 (F16 der Angriffsmatrix): git 2.48 gibt `%aI` bei UTC als `…Z` aus — das Datum steht dann unverändert in der
/// Antwort von `GET /api/commits` (nie leer, nie „Datum nicht lesbar“), bei +0000 und -0000 gleich, mit Zeitzone so wie geliefert.
/// Ebene: Integration mit echtem `git` im Wegwerf-Repo und der echten Antwort des Webservers.
/// </summary>
[Platform(Exclude = "Win", Reason = "Wegwerf-Repos und git-Aufrufe")]
[UnsupportedOSPlatform("windows")]
public class CommitDatumTests
{
    [TestCase("+0000", "2023-11-14T22:13:20Z")]
    [TestCase("-0000", "2023-11-14T22:13:20Z")]
    [TestCase("+0200", "2023-11-14T22:13:20+02:00")]
    [TestCase("-0530", "2023-11-14T22:13:20-05:30")]
    [Description("F16 (Abnahme-Probe): das Datum steht in /api/commits so, wie git es liefert — bei UTC mit Z")]
    public async Task Wenn_der_Commit_in_der_Zeitzone_liegt_dann_Datum_wie_git_es_liefert(string zeitzone, string erwartet)
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei("a.txt", "a\n");
        var hash = repo.Committe("Start", "Anna Beispiel", $"2023-11-14T22:13:20 {zeitzone}", "");
        var commits = CommitSprache.Lies(repo.Ordner, CommitSprache.Einzelne(hash));
        var protokoll = new StderrProtokoll(new StringWriter(), TimeProvider.System, Protokollstufe.Warnung);
        await using var server = await Webserver.StartenAsync(0, commits, TestDateiquelle.Leer(), TestDiffquelle.Leer(), TestUebersichtsquelle.Leer(), TestZusammenquelle.Leer(), Oberflaeche.AusDemProgramm(), protokoll);
        using var client = new HttpClient();

        var json = await client.GetStringAsync(new Uri(new Uri(server.Adresse), "api/commits"));

        using var dokument = JsonDocument.Parse(json);
        var eintrag = dokument.RootElement.EnumerateArray().Single();
        Assert.That(eintrag.GetProperty("hash").GetString(), Is.EqualTo(hash));
        Assert.That(eintrag.GetProperty("datum").GetString(), Is.EqualTo(erwartet));
    }
}
