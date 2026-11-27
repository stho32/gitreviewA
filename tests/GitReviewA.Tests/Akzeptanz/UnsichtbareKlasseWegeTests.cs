using System.Net;
using System.Runtime.Versioning;
using System.Text;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// B5804 (R00058, Kriterien 3 und 5) am Programm als Prozess: das Ergebnis auf stdout trägt die Marke von `h⟨U+3164⟩.txt`, und
/// legitimer Text (Emoji mit Variationsselektor, ZWJ-Folge, Koreanisch in NFC/NFD, Braille) zeigt keine Marke. Repo V der User
/// Story: `vsel` (Autor `Anna`+U+FE0F, Betreff `Gut`+U+3164) und `vnamen` (`v❤️.txt`, `hㅤ.txt`). Das Sprung- und das Musterfeld
/// prüfen <c>Sprung/SprungInteractorTests</c> und <c>Aufruf/AufrufleserTests</c>.
/// </summary>
[UnsupportedOSPlatform("windows")]
public class UnsichtbareKlasseWegeTests
{
    private const string AutorMitSelektor = "Anna\uFE0F";
    private const string BetreffMitFueller = "Gut\u3164";
    private const string DateiMitHerz = "v\u2764\uFE0F.txt";
    private const string DateiMitFueller = "h\u3164.txt";

    [Test]
    [Description("R00058 Kriterium 3: das Ergebnis auf stdout nennt h⟨U+3164⟩.txt mit der Anmerkung und kein rohes Zeichen")]
    public async Task Wenn_h_Fueller_annotiert_und_beendet_wird_dann_traegt_das_Ergebnis_auf_stdout_die_Marke()
    {
        using var repo = WegwerfRepo.OhneCommits();
        var vnamen = RepoVAnlegen(repo);
        await using var gr = await ErgebnisKopierenTreiber.StartenAsync(repo.Ordner, vnamen);

        var anmerkung = await gr.AnnotiereAsync(vnamen, DateiMitFueller, 2, "prüfen");
        var beenden = await gr.BeendeAsync();
        var ende = await gr.WarteAufEndeAsync();

        var ergebnis = Encoding.UTF8.GetString(gr.Standardausgabe());
        Assert.That((anmerkung.Status, beenden.Status, ende), Is.EqualTo((HttpStatusCode.Created, HttpStatusCode.OK, 0)));
        Assert.That(ergebnis, Does.Contain("## 1. h⟨U+3164⟩.txt:2"), "die Überschrift trägt die Marke");
        Assert.That(ergebnis, Does.Contain("> prüfen"), "die Anmerkung steht im Ergebnis");
        // Ordinal vergleichen: `Does.Not.Contain` vergleicht kulturbezogen und übersieht standardmäßig unsichtbare Zeichen.
        Assert.That(ergebnis.Contains('\u3164', StringComparison.Ordinal), Is.False, "kein roher Hangul-Füller");
        Assert.That(ergebnis.Contains('\uFE0F', StringComparison.Ordinal), Is.False, "kein roher Variationsselektor");
    }

    [Test]
    [Description("R00058 Kriterium 3 und 5: das herz-Auge bleibt mit Marke, unannotierte Dateien stehen als Anzeigename")]
    public async Task Wenn_beide_fremden_Namen_im_Ergebnis_stehen_dann_tragen_sie_die_Marke()
    {
        using var repo = WegwerfRepo.OhneCommits();
        var vnamen = RepoVAnlegen(repo);
        await using var gr = await ErgebnisKopierenTreiber.StartenAsync(repo.Ordner, vnamen);

        await gr.HakeAsync(vnamen, DateiMitHerz, abgehakt: true);
        var beenden = await gr.BeendeAsync();
        var ende = await gr.WarteAufEndeAsync();

        var ergebnis = Encoding.UTF8.GetString(gr.Standardausgabe());
        Assert.That((beenden.Status, ende), Is.EqualTo((HttpStatusCode.OK, 0)));
        Assert.That(ergebnis, Does.Contain("- v❤⟨U+FE0F⟩.txt (Commit "), "der Haken nennt den Anzeigenamen");
        Assert.That(ergebnis, Does.Contain("- h⟨U+3164⟩.txt (Commit "), "die ungeprüfte Datei nennt den Anzeigenamen");
        Assert.That(ergebnis.Contains("\u2764\uFE0F", StringComparison.Ordinal), Is.False, "kein roher Variationsselektor");
        Assert.That(ergebnis.Contains('\u3164', StringComparison.Ordinal), Is.False, "kein roher Hangul-Füller");
    }

    /// <summary>
    /// Repo V der User Story R00058: `vsel` mit Autor `Anna`+U+FE0F und Betreff `Gut`+U+3164, danach `vnamen` mit `v❤️.txt` und
    /// `hㅤ.txt` (je drei Zeilen); liefert den Hash von `vnamen`.
    /// </summary>
    private static string RepoVAnlegen(WegwerfRepo repo)
    {
        repo.SchreibeDatei("v.txt", "Stand 1\n");
        repo.Committe(BetreffMitFueller, AutorMitSelektor, "2026-03-04T09:15:00+01:00", string.Empty);
        repo.SchreibeDatei(DateiMitHerz, "eins\nzwei\ndrei\n");
        repo.SchreibeDatei(DateiMitFueller, "eins\nzwei\ndrei\n");
        repo.SchreibeDatei("sonst.txt", "x\n");
        return repo.Committe("Namen", "Kim Beispiel", "2026-03-05T18:30:00+01:00", string.Empty);
    }
}
