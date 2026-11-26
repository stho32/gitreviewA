using System.Runtime.Versioning;
using GitReviewA.Aufruf;
using GitReviewA.Git;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Kriterien 4 und 5 der User Story R00048 (Szenarien 4, 5): zu große Commit-Angaben weisen den Lauf beim Start ab —
/// Exit 2, kein Server, stdout leer, genau eine stderr-Zeile mit der Grenze und ohne fremden Text. Ebene: Integration gegen
/// den Aufruf-Interactor, ein Prozesstest für Exit-Code, stdout und stderr (Produktgrenze 8 MiB), die Spanne mit dem
/// Testparameter 4 KiB.
/// </summary>
[Platform(Exclude = "Win", Reason = "Wegwerf-Repos und git-Aufrufe")]
[UnsupportedOSPlatform("windows")]
public class CommitGrenzeTests
{
    [Test]
    [Description("Kriterium 4 (G1): 9-MiB-Message → Abweisung mit „8 MiB“, nicht „nicht auflösbar“, Exit 2")]
    public void Wenn_die_Commit_Angaben_ueber_der_Produktgrenze_liegen_dann_abgewiesen_mit_der_Grenze()
    {
        using var f = CommitRepo.F();
        var stderr = new StringWriter();

        var fehler = CommitSprache.LiesMitFehler(f.Ordner, CommitSprache.Einzelne(f.Hash("g")), stderr);

        Assert.That(fehler.ExitCode, Is.EqualTo(2));
        Assert.That(fehler.Meldung, Does.Contain("8 MiB"));
        Assert.That(fehler.Meldung, Does.Not.Contain("nicht auflösen"));
    }

    [Test]
    [Description("Kriterium 4: alle drei Auswahlarten werden abgewiesen; t u startet weiter")]
    public void Wenn_jede_Auswahlart_ueber_der_Grenze_liegt_dann_jede_abgewiesen()
    {
        using var f = CommitRepo.F();
        var u = f.Hash("u");
        var g = f.Hash("g");

        var ueberEinzelcommit = CommitSprache.LiesMitFehler(f.Ordner, CommitSprache.Einzelne(g));
        var ueberBereich = CommitSprache.LiesMitFehler(f.Ordner, CommitSprache.AusBereichen($"{u}..{g}"));
        var ueberZweiBereiche = CommitSprache.LiesMitFehler(f.Ordner, CommitSprache.AusBereichen($"{u}..{g}", $"{u}..{f.Hash("h")}"));
        var ueberStdin = CommitSprache.Laufe(f.Ordner, Auswahl.UeberStdin(), new StringWriter(), $"{g}\n").Fehler;

        foreach (var (name, fehler) in new (string, Aufruffehler?)[]
        {
            ("Einzelcommit", ueberEinzelcommit),
            ("Bereich", ueberBereich),
            ("zwei Bereiche", ueberZweiBereiche),
            ("stdin", ueberStdin),
        })
        {
            Assert.That(fehler, Is.Not.Null, $"{name} wurde nicht abgewiesen");
            Assert.That(fehler!.Meldung, Does.Contain("8 MiB"), $"{name}");
            Assert.That(fehler.ExitCode, Is.EqualTo(2), $"{name}");
        }

        var kontrolle = CommitSprache.Lies(f.Ordner, CommitSprache.Einzelne(f.Hash("t"), u));
        Assert.That(kontrolle.Anzahl, Is.EqualTo(2), "eine Auswahl unter der Grenze startet weiter");
    }

    [Test]
    [Description("Kriterium 4, L5: die Meldung ist eine Zeile ohne Text aus dem Commit und ohne Steuer- oder Formatzeichen")]
    public void Wenn_abgewiesen_dann_Meldung_ohne_fremden_Text()
    {
        using var f = CommitRepo.F();
        var stderr = new StringWriter();

        var fehler = CommitSprache.LiesMitFehler(f.Ordner, CommitSprache.Einzelne(f.Hash("g")), stderr);

        Assert.That(fehler.Meldung, Does.Not.Contain("Riesig"), "kein Autor, kein Betreff, keine Message");
        Assert.That(fehler.Meldung, Does.Not.Contain("\n"));
        Assert.That(fehler.Debugtext, Is.Empty, "kein roher git-Text neben der Meldung");
        Assert.That(fehler.Meldung.Any(IstSteuerOderFormatzeichen), Is.False, "kein Steuer- oder Formatzeichen");
    }

    [Test]
    [Description("Kriterium 5 als Spanne über den Aufruf: Grenze 4 KiB — 3 KiB startet, 5 KiB und 7 KiB werden abgewiesen")]
    public void Wenn_die_Grenze_4_KiB_ist_dann_spanne_ueber_den_Aufruf()
    {
        var grenze = new Ausgabegrenze(4096);

        using var klein = MitMessage(3 * 1024, out var kleinHash);
        var gelesen = CommitSprache.Laufe(klein.Ordner, CommitSprache.Einzelne(kleinHash), new StringWriter(), string.Empty, grenze);
        Assert.That(gelesen.IstErfolg, Is.True, "3 KiB liegt unter der Grenze");
        Assert.That(gelesen.Commits!.AlsArray().Single().Rumpf.Length, Is.EqualTo(3 * 1024), "die ganze Message");

        using var mittel = MitMessage(5 * 1024, out var mittelHash);
        var abgewiesen = CommitSprache.Laufe(mittel.Ordner, CommitSprache.Einzelne(mittelHash), new StringWriter(), string.Empty, grenze);
        Assert.That(abgewiesen.IstErfolg, Is.False, "5 KiB liegt über der Grenze");
        Assert.That(abgewiesen.Fehler!.Meldung, Does.Contain("MiB"), "die Meldung nennt die Grenze");

        using var gross = MitMessage(7 * 1024, out var grossHash);
        var abgewiesenGross = CommitSprache.Laufe(gross.Ordner, CommitSprache.Einzelne(grossHash), new StringWriter(), string.Empty, grenze);
        Assert.That(abgewiesenGross.IstErfolg, Is.False, "7 KiB liegt über der Grenze (tötet den Mutanten „Grenze × 2“)");
    }

    [Test]
    [Description("Kriterium 4 (M1/M4, Prozess): Exit 2, kein Server, stdout leer, genau eine stderr-Zeile mit der Grenze")]
    public async Task Wenn_der_Prozess_zu_grosse_Angaben_liest_dann_Exit_2_ohne_Server()
    {
        using var f = CommitRepo.F();
        using var lauf = await Dateiansichtprozess.StarteAsync(f.Ordner, f.Hash("g"), "--kein-browser");

        var exit = await lauf.WarteAufEndeAsync();

        Assert.That(exit, Is.EqualTo(2), "Exit 2 wie jeder ungültige Aufruf");
        Assert.That(lauf.Adresse, Is.Null, "kein Server");
        Assert.That(lauf.Ausgabe, Is.Empty, "stdout gehört dem Ergebnis, hier bleibt es leer");
        var zeilen = lauf.Fehler.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        Assert.That(zeilen, Has.Length.EqualTo(1), "genau eine Zeile");
        Assert.That(zeilen[0], Does.Contain("8 MiB"));
        Assert.That(zeilen[0], Does.Not.Contain("nicht auflösen"));
        Assert.That(zeilen[0], Does.Not.Contain("Riesig"), "kein Text aus dem Commit");
    }

    private static bool IstSteuerOderFormatzeichen(char zeichen)
    {
        var kategorie = char.GetUnicodeCategory(zeichen);
        return char.IsControl(zeichen) || kategorie == System.Globalization.UnicodeCategory.Format;
    }

    /// <summary>Ein Repo mit einem Commit, dessen Message <paramref name="groesse"/> Byte Rumpf trägt.</summary>
    private static WegwerfRepo MitMessage(int groesse, out string hash)
    {
        var repo = WegwerfRepo.MitCommits();
        var datei = Path.Combine(repo.Ordner, "..", $".nachricht-{Guid.NewGuid():N}.txt");
        File.WriteAllText(datei, "Betreff\n\n" + new string('m', groesse) + "\n");
        try
        {
            hash = repo.CommitteAusDatei(datei, "Anna Beispiel", "2026-03-04T09:15:00+01:00");
        }
        finally
        {
            File.Delete(datei);
        }
        return repo;
    }
}
