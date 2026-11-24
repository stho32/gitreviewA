using System.Diagnostics;
using System.Runtime.Versioning;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Spezifikation R00011, Ergebnis und Lastprofil auf Ebene des Interactors (Kriterien 3, 5, 6, 7, 8 und 15; Szenarien 3, 5, 6, 9, 10).
/// stdout und stderr des Prozesses und die Zeit bis zum Prozessende prüft <c>e2e/tests/datei-abhaken-programm.spec.js</c>.
/// </summary>
[UnsupportedOSPlatform("windows")]
public class DateiAbhakenErgebnisTests
{
    private static readonly string[] Pqr = ["p", "q", "r"];

    [Test]
    public void Wenn_README_in_p_und_src_b_in_q_abgehakt_dann_Ergebnis_Byte_fuer_Byte_wie_in_der_User_Story()
    {
        using var repo = AbhakenRepo.Vorbereitung();
        var gr = DateiAbhakenSprache.Aufruf(repo, Pqr);
        gr.Hake("p", "README.md");
        gr.Hake("q", "src/b.txt");

        var ergebnis = gr.Beenden();

        var erwartet = string.Join("\n",
            "# Ergebnis manueller Review", "", "Keine Anmerkungen.", "", "## Dateien", "", "Abgehakt: 2 von 8", "",
            gr.Ergebniszeile("p", "README.md"), gr.Ergebniszeile("q", "src/b.txt"), "", "Ungeprüft: 6 von 8", "",
            gr.Ergebniszeile("p", "alt.txt"), gr.Ergebniszeile("p", "src/a.txt"), gr.Ergebniszeile("p", "src/b.txt"),
            gr.Ergebniszeile("q", "LIESMICH.md"), gr.Ergebniszeile("q", "alt.txt"), gr.Ergebniszeile("q", "logo.bin")) + "\n";
        Assert.That(ergebnis, Is.EqualTo(erwartet));
    }

    [Test]
    public void Wenn_alle_acht_Stellen_abgehakt_und_beendet_dann_Abgehakt_8_von_8_und_Ungeprueft_0_von_8_ohne_Aufzaehlung()
    {
        using var repo = AbhakenRepo.Vorbereitung();
        var gr = DateiAbhakenSprache.Aufruf(repo, Pqr);
        foreach (var datei in new[] { "README.md", "alt.txt", "src/a.txt", "src/b.txt" })
        {
            gr.Hake("p", datei);
        }
        foreach (var datei in new[] { "LIESMICH.md", "alt.txt", "logo.bin", "src/b.txt" })
        {
            gr.Hake("q", datei);
        }

        var zeilen = gr.Beenden().Split('\n');

        Assert.That(zeilen, Does.Contain("Abgehakt: 8 von 8"));
        Assert.That(zeilen.Count(zeile => zeile.StartsWith("- ", StringComparison.Ordinal)), Is.EqualTo(8));
        Assert.That(zeilen[^2..], Is.EqualTo(new[] { "Ungeprüft: 0 von 8", "" }));
    }

    [TestCase(false)]
    [TestCase(true)]
    public void Wenn_kein_Haken_oder_ein_entnommener_Haken_dann_genau_das_Ergebnis_aus_R00002(bool hakenGesetztUndEntnommen)
    {
        using var repo = AbhakenRepo.Vorbereitung();
        var gr = DateiAbhakenSprache.Aufruf(repo, Pqr);
        if (hakenGesetztUndEntnommen)
        {
            gr.Hake("p", "README.md");
            gr.NimmHakenWeg("p", "README.md");
        }

        var ergebnis = gr.Beenden();

        Assert.That(ergebnis, Is.EqualTo("# Ergebnis manueller Review\n\nKeine Anmerkungen.\n"));
    }

    [TestCase(true)]
    [TestCase(false)]
    public void Wenn_der_Name_Zeilenumbruch_und_U_202E_traegt_dann_steht_er_mit_Marken_in_einer_Zeile_abgehakt_oder_nicht(bool abgehakt)
    {
        using var repo = AbhakenRepo.Y(mitKontrolldatei: true);
        var gr = DateiAbhakenSprache.Aufruf(repo, ["y"]);
        if (abgehakt)
        {
            gr.Hake("y", AbhakenRepo.NameMitZeilenumbruchUndRichtungszeichen);
        }
        else
        {
            gr.Hake("y", "b.txt");
        }

        var zeilen = gr.Beenden().Split('\n');

        var zeileDesNamens = Array.IndexOf(zeilen, gr.Ergebniszeile("y", "ab⟨U+000A⟩cd⟨U+202E⟩.txt"));
        var kopfUngeprueft = Array.IndexOf(zeilen, "Ungeprüft: 1 von 2");
        Assert.That(zeileDesNamens, Is.GreaterThan(0));
        Assert.That(zeileDesNamens > kopfUngeprueft, Is.EqualTo(!abgehakt), "der Name steht in der Liste seines Zustands");
        Assert.That(string.Join("\n", zeilen).Where(zeichen => char.IsControl(zeichen) && zeichen != '\n' || zeichen == '‮'), Is.Empty);
    }

    [Test]
    public void Wenn_nach_dem_Beenden_ein_Haken_gesetzt_werden_soll_dann_beendet_und_nicht_im_Ergebnis()
    {
        using var repo = AbhakenRepo.Vorbereitung();
        var gr = DateiAbhakenSprache.Aufruf(repo, Pqr);
        gr.Hake("p", "README.md");
        var ergebnis = gr.Beenden();

        var nachDemBeenden = gr.Hake("p", "alt.txt");

        Assert.That(nachDemBeenden.Ausgang, Is.EqualTo("beendet"));
        Assert.That(ergebnis, Does.Contain("Abgehakt: 1 von 8"));
        Assert.That(gr.Beenden(), Is.EqualTo(ergebnis));
    }

    [Test]
    public void Wenn_2000_Stellen_und_1000_ueber_den_Interactor_abgehakt_dann_Beenden_mit_je_1000_Zeilen_in_hoechstens_700_ms()
    {
        using var repo = AbhakenRepo.G();
        var gr = DateiAbhakenSprache.Aufruf(repo, ["g"]);
        foreach (var nummer in Enumerable.Range(1, 1000))
        {
            gr.Hake("g", $"viele/datei-{nummer * 2:D4}.txt");
        }
        var uhr = Stopwatch.StartNew();

        var ergebnis = gr.Beenden();

        uhr.Stop();
        TestContext.Out.WriteLine($"Beenden am Interactor mit 2000 Stellen und 1000 Haken: {uhr.Elapsed.TotalMilliseconds:F1} ms");
        var zeilen = ergebnis.Split('\n');
        var abschnittUngeprueft = Array.IndexOf(zeilen, "Ungeprüft: 1000 von 2000");
        Assert.That(zeilen, Does.Contain("Abgehakt: 1000 von 2000"));
        Assert.That(abschnittUngeprueft, Is.GreaterThan(0));
        Assert.That(zeilen[..abschnittUngeprueft].Count(zeile => zeile.StartsWith("- ", StringComparison.Ordinal)), Is.EqualTo(1000));
        Assert.That(zeilen[abschnittUngeprueft..].Count(zeile => zeile.StartsWith("- ", StringComparison.Ordinal)), Is.EqualTo(1000));
        Assert.That(uhr.Elapsed, Is.LessThan(TimeSpan.FromMilliseconds(700)));
    }
}
