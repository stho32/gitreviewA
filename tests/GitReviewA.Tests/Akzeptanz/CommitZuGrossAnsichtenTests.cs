using System.Net;
using System.Runtime.Versioning;
using System.Text.Json;
using GitReviewA.Dateien;
using GitReviewA.Diff;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Protokoll;
using GitReviewA.Server;
using GitReviewA.Tests.Hilfen;
using GitReviewA.Zusammen;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Kriterien 6 und 7 der User Story R00048 (Szenarien 6, 7) mit Repo W und dem Testparameter 4 KiB: die Dateiliste eines zu
/// großen Commits zeigt „zu groß“ mit der Grenze (nie leer, nie „Keine Dateien geändert“), der Nachbar-Commit bleibt lesbar,
/// die Zusammen-Ansicht zeigt ihren Fehlerzustand mit dem Grund, und das Abhaken wird mit diesem Grund abgelehnt.
/// Ebene: Integration gegen Dateien-Endpunkt, Zusammen- und Haken-Interactor mit echtem `git` im Wegwerf-Repo.
/// </summary>
[Platform(Exclude = "Win", Reason = "Wegwerf-Repos und git-Aufrufe")]
[UnsupportedOSPlatform("windows")]
public class CommitZuGrossAnsichtenTests
{
    private static readonly Ausgabegrenze Klein = new(4096);

    [Test]
    [Description("Kriterium 6 (G6): Dateiliste über der Grenze → „zu groß“ mit der Grenze; der Nachbar-Commit bleibt lesbar")]
    public async Task Wenn_die_Dateiliste_ueber_der_Grenze_liegt_dann_zu_gross_und_Nachbar_lesbar()
    {
        using var w = CommitRepo.W();
        var commits = CommitsVonW(w);
        var protokoll = Protokoll(new StringWriter());
        var dateiquelle = new GemerkteDateiquelle(new GitDateiquelle(w.Ordner, Klein));
        await using var server = await Webserver.StartenAsync(0, commits, dateiquelle, TestDiffquelle.Leer(), TestUebersichtsquelle.Leer(), TestZusammenquelle.Leer(), Oberflaeche.AusDemProgramm(), protokoll);
        using var client = new HttpClient();

        var zuGross = await client.GetStringAsync(new Uri(new Uri(server.Adresse), $"api/commits/{w.Hash("w")}/dateien"));
        var nachbar = await client.GetStringAsync(new Uri(new Uri(server.Adresse), $"api/commits/{w.Hash("p")}/dateien"));

        using var dokument = JsonDocument.Parse(zuGross);
        Assert.That(dokument.RootElement.GetProperty("zuGross").GetBoolean(), Is.True);
        Assert.That(dokument.RootElement.GetProperty("meldung").GetString(), Does.Contain("zu groß").And.Contain("4 KiB"));
        using var nachbardokument = JsonDocument.Parse(nachbar);
        Assert.That(nachbardokument.RootElement.ValueKind, Is.EqualTo(JsonValueKind.Array), "der Nachbar-Commit bleibt eine Liste");
        Assert.That(nachbardokument.RootElement.GetArrayLength(), Is.EqualTo(1), "p ändert nur a.txt");
    }

    [Test]
    [Description("Kriterium 7: die Zusammen-Ansicht zeigt über der Grenze ihren Fehlerzustand mit dem Grund „zu groß“")]
    public void Wenn_die_Zusammen_Ansicht_ueber_der_Grenze_liegt_dann_ZuGrossGrund()
    {
        using var w = CommitRepo.W();
        var commits = CommitsVonW(w);

        var ueberDerGrenze = Zusammenstand(w, commits, Klein);
        var unterDerGrenze = Zusammenstand(w, commits, new Ausgabegrenze(1024 * 1024));

        Assert.That(ueberDerGrenze.IstLesbar, Is.False);
        Assert.That(ueberDerGrenze.ZuGrossGrund, Does.Contain("zu groß").And.Contain("4 KiB"));
        Assert.That(unterDerGrenze.IstLesbar, Is.True, "unter der Grenze bleibt die Ansicht lesbar");
        Assert.That(unterDerGrenze.ZuGrossGrund, Is.Empty);
    }

    [Test]
    [Description("Kriterium 7: das Abhaken einer Datei von w wird mit dem Grund „zu groß“ abgelehnt (kein Haken gesetzt)")]
    public void Wenn_die_Uebersicht_ueber_der_Grenze_liegt_dann_Abhaken_mit_Grund_zu_gross()
    {
        using var w = CommitRepo.W();
        var commits = CommitsVonW(w);
        var protokoll = Protokoll(new StringWriter());
        var uebersicht = new GemerkteUebersicht(new GitUebersichtsquelle(commits, w.Ordner, Klein));
        var haken = new Hakenspeicher();
        var interactor = new DateiAbhakenInteractor(uebersicht, haken, new ZusammenLesenInteractor(commits, uebersicht, TestZusammenquelle.Leer(), TestDiffquelle.Leer(), protokoll), protokoll);

        var ergebnis = interactor.Setze(new Hakenanfrage(w.Hash("w"), "a.txt", true));

        Assert.That(ergebnis.Ausgang, Is.EqualTo(Hakenausgang.NichtLesbar));
        Assert.That(ergebnis.Grund, Does.Contain("zu groß").And.Contain("4 KiB"));
        Assert.That(haken.Schnappschuss().Anzahl, Is.Zero, "kein Haken gesetzt");
    }

    private static Commitzeilen CommitsVonW(CommitRepo w)
    {
        return CommitSprache.Lies(w.Ordner, CommitSprache.Einzelne(w.Hash("w"), w.Hash("p")));
    }

    private static Zusammenstand Zusammenstand(CommitRepo w, Commitzeilen commits, Ausgabegrenze grenze)
    {
        var protokoll = Protokoll(new StringWriter());
        var uebersicht = new GemerkteUebersicht(new GitUebersichtsquelle(commits, w.Ordner, grenze));
        var interactor = new ZusammenLesenInteractor(commits, uebersicht, new GitZusammenquelle(commits, w.Ordner, grenze), TestDiffquelle.Leer(), protokoll);
        return interactor.Stand();
    }

    private static StderrProtokoll Protokoll(StringWriter ziel)
    {
        return new StderrProtokoll(ziel, TimeProvider.System, Protokollstufe.Warnung);
    }
}
