using System.Runtime.Versioning;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Spezifikation R00008 „Ganze Datei mit Diff“, Kriterien auf Ebene des Interactors (Szenarien 1, 2, 4, 5, 12, 13, 15, 16 der User Story):
/// was gelesen wird und in welcher Reihenfolge. Bedienung, Darstellung und Ladeverhalten der Oberfläche prüft <c>e2e/tests/ganze-datei-mit-diff.spec.js</c>.
/// </summary>
[Platform(Exclude = "Win", Reason = "Marker-Programme sind Shell-Skripte")]
[UnsupportedOSPlatform("windows")]
public class GanzeDateiMitDiffTests
{
    private const string OhneZeilenende = "\\ No newline at end of file";

    [Test]
    public void Wenn_lang_txt_als_ganze_Datei_dann_21_Zeilen_lueckenlos_und_zurueck_wieder_die_13_der_Aenderungen()
    {
        using var repo = DiffRepo.A();
        var gr = GanzeDateiSprache.Aufruf(repo, ["q", "p"]);

        var ganz = gr.GanzeDatei("q", "lang.txt");
        var nurAenderungen = gr.NurAenderungen("q", "lang.txt");

        Assert.That(ganz.Abschnittskoepfe, Has.Length.EqualTo(1), "ein Abschnitt über die ganze Datei");
        Assert.That(ganz.Zeilen, Is.EqualTo(new[]
        {
            Kontext("z01"), Kontext("z02"), Minus("z03"), Plus("Z03"),
            Kontext("z04"), Kontext("z05"), Kontext("z06"), Kontext("z07"), Kontext("z08"), Kontext("z09"), Kontext("z10"),
            Kontext("z11"), Kontext("z12"), Kontext("z13"), Kontext("z14"), Kontext("z15"), Kontext("z16"), Kontext("z17"),
            Minus("z18"), Kontext("z19"), Kontext("z20"),
        }));
        Assert.That(nurAenderungen.Abschnittskoepfe, Is.EqualTo(new[] { "@@ -1,6 +1,6 @@", "@@ -15,6 +15,5 @@ z14" }));
        Assert.That(nurAenderungen.Zeilen, Has.Length.EqualTo(13));
    }

    [TestCase("lang.txt")]
    [TestCase("src/b.txt")]
    public void Wenn_ganze_Datei_dann_traegt_jede_Zeile_mit_Nummer_neu_n_die_Zeile_n_danach_und_mit_Nummer_alt_m_die_Zeile_m_davor(string pfad)
    {
        using var repo = DiffRepo.A();
        var gr = GanzeDateiSprache.Aufruf(repo, ["q", "p"]);

        var ganz = gr.GanzeDatei("q", pfad);

        Assert.That(ganz.TexteMitNummerNeu(), Is.EqualTo(gr.StandNach("q", pfad)));
        Assert.That(ganz.TexteMitNummerAlt(), Is.EqualTo(gr.StandVor("q", pfad)));
    }

    [Test]
    public void Wenn_src_b_txt_als_ganze_Datei_dann_eins_minus_zwei_plus_ZWEI_plus_drei()
    {
        using var repo = DiffRepo.A();
        var gr = GanzeDateiSprache.Aufruf(repo, ["q", "p"]);

        var ganz = gr.GanzeDatei("q", "src/b.txt");

        Assert.That(ganz.Zeilen, Is.EqualTo(new[] { Kontext("eins"), Minus("zwei"), Plus("ZWEI"), Plus("drei") }));
    }

    [Test]
    public void Wenn_hinzugefuegt_geloescht_ohne_Zeilenende_umbenannt_oder_binaer_dann_dieselben_Zeilen_und_Arten_wie_in_nur_Aenderungen()
    {
        using var repo = DiffRepo.A();
        var gr = GanzeDateiSprache.Aufruf(repo, ["q", "p"]);
        var langeZeile = string.Concat(Enumerable.Repeat("0123456789", 30));

        Assert.That(gr.GanzeDatei("q", "breit.txt").Zeilen, Is.EqualTo(new[] { Plus("kurz"), Plus(langeZeile) }));
        Assert.That(gr.GanzeDatei("q", "alt.txt").Zeilen, Is.EqualTo(new[] { Minus("a1"), Minus("a2"), Minus("a3"), Minus("a4") }));
        Assert.That(gr.GanzeDatei("q", "ende.txt").Zeilen, Is.EqualTo(new[] { Minus("a"), OhneZeilenende, Plus("a") }));
        Assert.That(gr.GanzeDatei("q", "LIESMICH.md").Art, Is.EqualTo("leer"));
        Assert.That(gr.GanzeDatei("q", "LIESMICH.md").Zeilen, Is.Empty, "Keine Zeilenänderungen");
        Assert.That(gr.GanzeDatei("q", "logo.bin").Art, Is.EqualTo("binaer"));
        Assert.That(gr.GanzeDatei("q", "logo.bin").Zeilen, Is.Empty, "kein Byte-Inhalt");
    }

    [Test]
    public void Wenn_umbenannt_mit_Aenderung_dann_ganze_Datei_mit_der_Aenderung_und_nicht_fuenf_hinzugefuegte_Zeilen()
    {
        using var repo = DiffRepo.R();
        var gr = GanzeDateiSprache.Aufruf(repo, ["r2"]);

        var ganz = gr.GanzeDatei("r2", "v.txt");

        Assert.That(ganz.Pfad, Is.EqualTo("v.txt"));
        Assert.That(ganz.Zeilen, Is.EqualTo(new[] { Kontext("l1"), Kontext("l2"), Minus("l3"), Plus("L3"), Kontext("l4"), Kontext("l5") }));
    }

    [Test]
    public void Wenn_Merge_dann_ganze_Datei_gegenueber_dem_ersten_Elternteil()
    {
        using var repo = DiffRepo.M();
        var gr = GanzeDateiSprache.Aufruf(repo, ["m"]);

        var ganz = gr.GanzeDatei("m", "f.txt");

        Assert.That(ganz.Zeilen, Is.EqualTo(new[] { Plus("neu") }));
    }

    [Test]
    public void Wenn_Objekt_des_Commits_fehlt_dann_nicht_lesbar_mit_Fehlerzeile_und_ein_anderer_Commit_bleibt_lesbar()
    {
        using var repo = DiffRepo.A();
        var gr = GanzeDateiSprache.Aufruf(repo, ["q", "p"]);
        gr.NurAenderungen("q", "src/b.txt");
        gr.ObjektdateiEntfernen("q");

        var ganz = gr.GanzeDatei("q", "src/b.txt");
        var ganzVonP = gr.GanzeDatei("p", "src/b.txt");

        Assert.That(ganz.Ausgang, Is.EqualTo("nicht lesbar"));
        var fehlerzeilen = gr.Fehlerzeilen();
        Assert.That(fehlerzeilen, Has.Length.EqualTo(1));
        Assert.That(fehlerzeilen[0], Does.Contain(gr.HashVon("q")).And.Contain("src/b.txt"));
        Assert.That(ganzVonP.Zeilen, Is.EqualTo(new[] { Plus("eins"), Plus("zwei") }));
    }

    [Test]
    public void Wenn_das_Repo_Diff_Programme_und_fremde_Einstellungen_hat_dann_zeigt_ganze_Datei_die_Zeilen_ohne_Programmstart()
    {
        using var repo = DiffRepo.AMitDiffProgrammenUndFremdenEinstellungen();
        var gr = GanzeDateiSprache.Aufruf(repo, ["q", "p"]);

        var b = gr.GanzeDatei("q", "src/b.txt");
        var k = gr.GanzeDatei("q", "k.txt");

        Assert.That(b.Zeilen, Is.EqualTo(new[] { Kontext("eins"), Minus("zwei"), Plus("ZWEI"), Plus("drei") }));
        Assert.That(k.Zeilen, Is.EqualTo(new[] { Kontext("oben"), Kontext(""), Minus("unten"), Plus("UNTEN") }));
        Assert.That(repo.VorhandeneMarker(), Is.Empty);
        repo.Git("show", gr.HashVon("q"), "--", "src/b.txt");
        Assert.That(repo.VorhandeneMarker(), Does.Contain("marker-textconv"), "Kontrolle: git show ohne Schutz startet textconv");
    }

    [Test]
    public void Wenn_aus_einem_Unterordner_gestartet_dann_liest_ganze_Datei_den_Pfad_ab_der_Wurzel()
    {
        using var repo = DiffRepo.A();
        var gr = GanzeDateiSprache.Aufruf(repo, ["q", "p"], unterordner: "src");

        Assert.That(gr.GanzeDatei("q", "src/b.txt").Zeilen, Is.EqualTo(new[] { Kontext("eins"), Minus("zwei"), Plus("ZWEI"), Plus("drei") }));
        Assert.That(gr.GanzeDatei("q", "lang.txt").Zeilen, Has.Length.EqualTo(21));
    }

    [TestCase("--output=pwn", "x")]
    [TestCase(":(glob)*.txt", "y")]
    [TestCase("c.txt", "z")]
    public void Wenn_der_Name_wie_eine_Option_oder_ein_Muster_aussieht_dann_zeigt_ganze_Datei_nur_die_eigene_Datei(string pfad, string inhalt)
    {
        using var repo = DiffRepo.A();
        var gr = GanzeDateiSprache.Aufruf(repo, ["s"]);

        var ganz = gr.GanzeDatei("s", pfad);

        Assert.That(ganz.Zeilen, Is.EqualTo(new[] { Plus(inhalt) }));
        Assert.That(File.Exists(Path.Combine(repo.Ordner, "pwn")), Is.False);
    }

    [Test]
    public void Wenn_eine_Zeile_in_20000_geaendert_dann_zeigt_ganze_Datei_alle_20001_Zeilen_in_Dateireihenfolge()
    {
        using var repo = DiffRepo.U();
        var gr = GanzeDateiSprache.Aufruf(repo, ["v"]);

        var ganz = gr.GanzeDatei("v", "gross.txt");

        Assert.That(ganz.Zeilen, Has.Length.EqualTo(20001));
        Assert.That(ganz.TexteMitNummerNeu(), Is.EqualTo(gr.StandNach("v", "gross.txt")));
        Assert.That(ganz.TexteMitNummerAlt(), Is.EqualTo(gr.StandVor("v", "gross.txt")));
        Assert.That(ganz.Zeilen[9999..10001], Is.EqualTo(new[] { Minus("zeile 10000"), Plus("geändert 10000") }));
        Assert.That(ganz.Zeilen[^1], Is.EqualTo(Kontext("zeile 20000")));
    }

    [Test]
    public void Wenn_nur_Aenderungen_und_dann_ganze_Datei_gelesen_dann_nennt_je_Lesen_eine_Debug_Zeile_die_Ansicht()
    {
        using var repo = DiffRepo.A();
        var gr = GanzeDateiSprache.Aufruf(repo, ["q", "p"]);

        gr.NurAenderungen("q", "src/b.txt");
        gr.NurAenderungen("q", "lang.txt");
        gr.GanzeDatei("q", "lang.txt");

        var zeilen = gr.DiffZeilenImProtokoll("q");
        Assert.That(zeilen, Has.Length.EqualTo(3));
        Assert.That(zeilen.Count(zeile => zeile.EndsWith("Datei lang.txt ganze Datei", StringComparison.Ordinal)), Is.EqualTo(1));
        Assert.That(zeilen.Count(zeile => zeile.EndsWith("ganze Datei", StringComparison.Ordinal)), Is.EqualTo(1));
    }

    private static string Kontext(string text)
    {
        return $" {text}";
    }

    private static string Plus(string text)
    {
        return $"+{text}";
    }

    private static string Minus(string text)
    {
        return $"-{text}";
    }
}
