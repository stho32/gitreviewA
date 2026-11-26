using System.Runtime.Versioning;
using GitReviewA.Aufruf;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Nacharbeit zu R00048 (Befund der Karte #60): ein Hexpräfix von 4 bis 6 Stellen, das sich nicht auflösen lässt, ist
/// wie jedes andere nicht auflösbare Präfix abzuweisen. Der Git-Leser kürzte den Hash für den Aufruftext und warf dabei
/// (ArgumentOutOfRangeException), der Lauf endete mit Exit 134 und Stacktrace. Ebene: Integration gegen den
/// Aufruf-Interactor, dazu ein Prozesstest für Exit-Code, stdout und stderr (Abnahme-Probe wörtlich).
/// </summary>
[Platform(Exclude = "Win", Reason = "Wegwerf-Repos und git-Aufrufe")]
[UnsupportedOSPlatform("windows")]
public class CommitPraefixTests
{
    /// <summary>Die kürzeste vom Aufrufleser erlaubte Form sind 4 Hexziffern; 7 Stellen waren schon auf main grün.</summary>
    private static readonly string[] NichtAufloesbarePraefixe = ["837d", "837da", "837da3", "837da3c"];

    [Test]
    [Description("Befund: nicht auflösbares Präfix mit 4, 5, 6 und 7 Stellen wird abgewiesen statt zu werfen")]
    public void Wenn_ein_kurzes_Praefix_sich_nicht_aufloest_dann_abgewiesen()
    {
        using var repo = WegwerfRepo.MitCommits("a");

        foreach (var praefix in NichtAufloesbarePraefixe)
        {
            var fehler = CommitSprache.LiesMitFehler(repo.Ordner, CommitSprache.Einzelne(praefix));

            Assert.That(fehler.ExitCode, Is.EqualTo(2), $"{praefix}: Exit 2 wie jeder ungültige Aufruf");
            Assert.That(fehler.Grund, Is.EqualTo(Aufrufgrund.AuswahlNichtAufloesbar), praefix);
            Assert.That(fehler.Meldung, Does.Contain("ließ sich nicht auflösen"), praefix);
        }
    }

    [Test]
    [Description("Schutz: dasselbe kurze Präfix löst sich weiterhin auf (4 Stellen, Repo mit einem Commit)")]
    public void Wenn_ein_kurzes_Praefix_sich_aufloest_dann_gelesen()
    {
        using var repo = WegwerfRepo.MitCommits("a");
        var voll = repo.Hashes[0];

        var gelesen = CommitSprache.Lies(repo.Ordner, CommitSprache.Einzelne(voll[..4]));

        Assert.That(gelesen.Anzahl, Is.EqualTo(1));
        Assert.That(gelesen.AlsArray().Single().Hash, Is.EqualTo(voll));
    }

    [Test]
    [Description("Befund: zwei Bereiche, deren Ende sich nicht auflöst, werden abgewiesen")]
    public void Wenn_zwei_Bereiche_ein_unbekanntes_Ende_haben_dann_abgewiesen()
    {
        using var repo = WegwerfRepo.MitCommits("a");

        var folge = CommitSprache.Laufe(repo.Ordner, CommitSprache.AusBereichen("HEAD..HEAD", "837d..HEAD"), new StringWriter());

        Assert.That(folge.IstErfolg, Is.False, "der Aufruf war gültig, erwartet war eine Abweisung");
        Assert.That(folge.Fehler!.ExitCode, Is.EqualTo(2));
        Assert.That(folge.Fehler.Meldung, Does.Contain("ließ sich nicht auflösen"));
    }

    [Test]
    [Description("Abnahme-Probe (Prozess): Exit 2, genau eine stderr-Zeile, kein Stacktrace, stdout leer")]
    public async Task Wenn_der_Prozess_ein_kurzes_unbekanntes_Praefix_liest_dann_Exit_2_ohne_StackTrace()
    {
        using var repo = WegwerfRepo.MitCommits("a");

        foreach (var praefix in NichtAufloesbarePraefixe)
        {
            using var lauf = await Dateiansichtprozess.StarteAsync(repo.Ordner, praefix, "--kein-browser");
            var exit = await lauf.WarteAufEndeAsync();

            Assert.That(exit, Is.EqualTo(2), $"{praefix}: Exit 2 wie jeder ungültige Aufruf");
            Assert.That(lauf.Adresse, Is.Null, $"{praefix}: kein Server");
            Assert.That(lauf.Ausgabe, Is.Empty, $"{praefix}: stdout gehört dem Ergebnis, hier bleibt es leer");
            var zeilen = lauf.Fehler.Split('\n', StringSplitOptions.RemoveEmptyEntries);
            Assert.That(zeilen, Has.Length.EqualTo(1), $"{praefix}: genau eine Zeile");
            Assert.That(zeilen[0], Does.Contain("ließ sich nicht auflösen"), praefix);
            Assert.That(lauf.Fehler, Does.Not.Contain("Unhandled exception"), $"{praefix}: kein Stacktrace");
        }
    }
}
