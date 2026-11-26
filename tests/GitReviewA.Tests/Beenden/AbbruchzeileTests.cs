using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Beenden;

/// <summary>
/// R00043 (PO 2026-11-26, `AI-Team/po-entscheidungen.md` Zeile 275): die Abbruchzeile nennt je **Laufart**, was abgebrochen
/// wurde. Der Review behält **wörtlich** „Review abgebrochen“ (R00005/R00050 — die Schnittstelle für auswertende Aufrufer),
/// die Dateiansicht nennt ihre eigene Laufart. Je Laufart ein echter Prozess mit SIGTERM: Exit 130, stdout leer, genau eine
/// Abbruchzeile, Stufe Warnung.
/// </summary>
[NonParallelizable]
public class AbbruchzeileTests
{
    [Test]
    public async Task Wenn_der_Review_ein_Beendigungssignal_bekommt_dann_130_und_genau_ein_Review_abgebrochen()
    {
        using var repo = WegwerfRepo.MitCommits("Erster Commit");
        using var lauf = await Dateiansichtprozess.StarteAsync(repo.Ordner, repo.Hashes[0], "--kein-browser", "--port", "0");
        Assert.That(lauf.Adresse, Is.Not.Null);

        await lauf.SendeSigtermAsync();
        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(130));
        Assert.That(lauf.Ausgabe, Is.Empty);
        Assert.That(lauf.Fehler, Does.Contain("WARNUNG [Abbruch] Review abgebrochen"));
        Assert.That(Abbruchzeilen(lauf.Fehler), Is.EqualTo(1));
        Assert.That(lauf.Fehler, Does.Not.Contain("Dateiansicht abgebrochen"));
    }

    /// <summary>Die Abbruchzeilen: Zeilen mit „[Abbruch]“ und „abgebrochen“ — die Abnahme erwartet genau eine.</summary>
    private static int Abbruchzeilen(string fehler)
    {
        return fehler.Split('\n').Count(zeile => zeile.Contains("[Abbruch]", StringComparison.Ordinal) && zeile.Contains("abgebrochen", StringComparison.Ordinal));
    }
}