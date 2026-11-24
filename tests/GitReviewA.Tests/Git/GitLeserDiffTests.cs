using System.Runtime.Versioning;
using System.Text;
using GitReviewA.Diff;
using GitReviewA.Git;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Git;

public class GitLeserDiffTests
{
    private const string Zeitpunkt = "2026-03-04T09:15:00+01:00";

    [Test]
    public void Wenn_Datei_geaendert_dann_unified_Diff_mit_drei_Zeilen_Kontext_ab_dem_ersten_Hunk()
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei("lang.txt", Zeilen(1, 20));
        repo.Committe("p", "A", Zeitpunkt, "");
        repo.SchreibeDatei("lang.txt", Zeilen(1, 20).Replace("z03\n", "Z03\n").Replace("z18\n", ""));
        var q = repo.Committe("q", "A", Zeitpunkt, "");

        var patch = PatchLesen(repo, q, new Dateiaenderung("M", "lang.txt", null, 1, 2));

        Assert.That(patch, Is.EqualTo(
            "@@ -1,6 +1,6 @@\n z01\n z02\n-z03\n+Z03\n z04\n z05\n z06\n" +
            "@@ -15,6 +15,5 @@ z14\n z15\n z16\n z17\n-z18\n z19\n z20\n"));
    }

    [Test]
    public void Wenn_Wurzelcommit_dann_Datei_als_hinzugefuegt()
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei("src/b.txt", "eins\nzwei\n");
        var p = repo.Committe("p", "A", Zeitpunkt, "");

        var patch = PatchLesen(repo, p, new Dateiaenderung("A", "src/b.txt", null, 2, 0));

        Assert.That(patch, Is.EqualTo("@@ -0,0 +1,2 @@\n+eins\n+zwei\n"));
    }

    [Test]
    public void Wenn_umbenannt_und_geaendert_dann_Diff_gegen_den_alten_Pfad()
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei("alt.txt", Zeilen(1, 10));
        repo.Committe("p", "A", Zeitpunkt, "");
        File.Delete(Path.Combine(repo.Ordner, "alt.txt"));
        repo.SchreibeDatei("neu.txt", Zeilen(1, 10).Replace("z10\n", "ZEHN\n"));
        var q = repo.Committe("q", "A", Zeitpunkt, "");

        var patch = PatchLesen(repo, q, new Dateiaenderung("R", "neu.txt", "alt.txt", 1, 1));

        Assert.That(patch, Is.EqualTo("@@ -7,4 +7,4 @@ z06\n z07\n z08\n z09\n-z10\n+ZEHN\n"));
    }

    [Test]
    public void Wenn_Merge_Commit_dann_Diff_gegen_den_ersten_Elternteil()
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei("base.txt", "basis\n");
        repo.Committe("c1", "A", Zeitpunkt, "");
        repo.Git("switch", "-q", "-c", "feature");
        repo.SchreibeDatei("f.txt", "neu\n");
        repo.Committe("feature", "A", Zeitpunkt, "");
        repo.Git("switch", "-q", "main");
        repo.SchreibeDatei("g.txt", "haupt\n");
        repo.Committe("c2", "A", Zeitpunkt, "");
        repo.Git("merge", "-q", "--no-ff", "feature", "-m", "Merge");
        var m = repo.Git("rev-parse", "HEAD");

        var patch = PatchLesen(repo, m, new Dateiaenderung("A", "f.txt", null, 1, 0));

        Assert.That(patch, Is.EqualTo("@@ -0,0 +1 @@\n+neu\n"));
    }

    [TestCase(":(glob)*.txt", "y")]
    [TestCase("--output=pwn", "x")]
    [TestCase("*.txt", "w")]
    public void Wenn_der_Pfad_wie_ein_Muster_oder_eine_Option_aussieht_dann_nur_die_eigene_Datei(string pfad, string inhalt)
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei(pfad, $"{inhalt}\n");
        repo.SchreibeDatei("c.txt", "z\n");
        var s = repo.Committe("s", "A", Zeitpunkt, "");

        var patch = PatchLesen(repo, s, new Dateiaenderung("A", pfad, null, 1, 0));

        Assert.That(patch, Is.EqualTo($"@@ -0,0 +1 @@\n+{inhalt}\n"));
        Assert.That(File.Exists(Path.Combine(repo.Ordner, "pwn")), Is.False);
    }

    [Test]
    public void Wenn_das_Repo_Kontext_Leerzeilen_und_Farben_umstellt_dann_bleibt_der_Diff_wie_ohne_Einstellungen()
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei("k.txt", "oben\n\nunten\n");
        repo.Committe("p", "A", Zeitpunkt, "");
        repo.SchreibeDatei("k.txt", "oben\n\nUNTEN\n");
        var q = repo.Committe("q", "A", Zeitpunkt, "");
        repo.Git("config", "diff.context", "0");
        repo.Git("config", "diff.suppressBlankEmpty", "true");
        repo.Git("config", "color.ui", "always");

        var patch = PatchLesen(repo, q, new Dateiaenderung("M", "k.txt", null, 1, 1));

        Assert.That(patch, Is.EqualTo("@@ -1,3 +1,3 @@\n oben\n \n-unten\n+UNTEN\n"));
    }

    [Test]
    public void Wenn_das_Repo_nahe_Hunks_zusammenlegen_laesst_dann_bleiben_sie_wie_ohne_Einstellung_getrennt()
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei("lang.txt", Zeilen(1, 20));
        repo.Committe("p", "A", Zeitpunkt, "");
        repo.SchreibeDatei("lang.txt", Zeilen(1, 20).Replace("z03\n", "Z03\n").Replace("z18\n", ""));
        var q = repo.Committe("q", "A", Zeitpunkt, "");
        repo.Git("config", "diff.interHunkContext", "10");

        var patch = PatchLesen(repo, q, new Dateiaenderung("M", "lang.txt", null, 1, 2));

        Assert.That(patch, Does.StartWith("@@ -1,6 +1,6 @@\n").And.Contain("\n@@ -15,6 +15,5 @@ z14\n"));
    }

    [TestCase("ohne Einstellung")]
    [TestCase(".gitmodules ignore=all")]
    [TestCase("config diff.submodule=log")]
    [TestCase("config diff.submodule=diff")]
    [TestCase("config diff.submodule=short")]
    public void Wenn_das_Repo_Submodule_ausblendet_oder_anders_darstellt_dann_zeigt_der_Diff_den_Zeigerwechsel(string einstellung)
    {
        using var repo = WegwerfRepo.MitCommits("eins", "zwei");
        var vorher = repo.Hashes[0];
        var nachher = repo.Hashes[1];
        var gitmodules = "[submodule \"sub\"]\n\tpath = sub\n\turl = ./sub\n";
        if (einstellung == ".gitmodules ignore=all")
        {
            gitmodules += "\tignore = all\n";
        }
        repo.SchreibeDatei(".gitmodules", gitmodules);
        repo.Git("add", ".gitmodules");
        repo.Git("update-index", "--add", "--cacheinfo", $"160000,{vorher},sub");
        repo.Git("commit", "-q", "-m", "Submodul");
        repo.Git("update-index", "--cacheinfo", $"160000,{nachher},sub");
        repo.Git("commit", "-q", "-m", "Submodul anheben");
        var bump = repo.Git("rev-parse", "HEAD");
        if (einstellung.StartsWith("config diff.submodule=", StringComparison.Ordinal))
        {
            repo.Git("config", "diff.submodule", einstellung["config diff.submodule=".Length..]);
        }

        var patch = PatchLesen(repo, bump, new Dateiaenderung("M", "sub", null, 1, 1));

        Assert.That(patch, Is.EqualTo($"@@ -1 +1 @@\n-Subproject commit {vorher}\n+Subproject commit {nachher}\n"));
    }

    [TestCase("src/b.txt", false, "@@ -1,2 +1,3 @@\n eins\n-zwei\n+ZWEI\n+drei\n")]
    [TestCase("src/b.txt", true, "@@ -1,2 +1,3 @@\n eins\n-zwei\n+ZWEI\n+drei\n")]
    [TestCase("README.md", false, "@@ -1 +1,2 @@\n Titel\n+Text\n")]
    [TestCase("README.md", true, "@@ -1 +1,2 @@\n Titel\n+Text\n")]
    public void Wenn_aus_einem_Unterordner_gestartet_dann_zeigt_der_Diff_jede_Datei_ab_der_Wurzel(string pfad, bool pfadeRelativ, string erwartet)
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei("src/b.txt", "eins\nzwei\n");
        repo.SchreibeDatei("README.md", "Titel\n");
        repo.Committe("p", "A", Zeitpunkt, "");
        repo.SchreibeDatei("src/b.txt", "eins\nZWEI\ndrei\n");
        repo.SchreibeDatei("README.md", "Titel\nText\n");
        var q = repo.Committe("q", "A", Zeitpunkt, "");
        repo.Git("config", "diff.relative", pfadeRelativ.ToString().ToLowerInvariant());
        var arbeitsordner = GitLeser.WurzelLesen(Path.Combine(repo.Ordner, "src"));

        var ausgabe = GitLeser.DiffLesen(q, new Dateiaenderung("M", pfad, null, 1, 1), Diffumfang.Aenderungen, arbeitsordner);

        Assert.That(Diffaufbereitung.PatchAbErstemHunk(ausgabe), Is.EqualTo(erwartet));
    }

    [TestCase(Binaerausgabe.OhneAbschaltung)]
    [TestCase(".gitattributes -diff")]
    [TestCase(".gitattributes binary")]
    [TestCase(".gitattributes Treiber mit binary=true")]
    [TestCase("config core.bigFileThreshold=1")]
    [TestCase("config core.attributesFile")]
    public void Wenn_das_Repo_Textdateien_als_binaer_ausgibt_dann_zeigt_der_Diff_trotzdem_die_Zeilen(string abschaltung)
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei("y.txt", "eins\n");
        repo.Committe("p", "A", Zeitpunkt, "");
        repo.SchreibeDatei("y.txt", "eins\nsteal();\n");
        var q = repo.Committe("q", "A", Zeitpunkt, "");
        Binaerausgabe.Einstellen(repo, abschaltung);

        var patch = PatchLesen(repo, q, new Dateiaenderung("M", "y.txt", null, 1, 0));

        Assert.That(patch, Is.EqualTo("@@ -1 +1,2 @@\n eins\n+steal();\n"));
    }

    [Test]
    public void Wenn_als_Text_gelesen_dann_zeigt_der_Diff_auch_eine_Datei_mit_Null_Bytes_mit_allen_Bytes()
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei("x.js", "a\0b\nsteal();\n");
        var p = repo.Committe("p", "A", Zeitpunkt, "");
        var datei = new Dateiaenderung("A", "x.js", null, null, null);
        Assert.That(PatchLesen(repo, p, datei), Is.Empty, "Kontrolle: ohne Wahl zeigt git keinen Inhalt");

        var patch = Diffaufbereitung.PatchAbErstemHunk(GitLeser.DiffAlsTextLesen(p, datei, Diffumfang.Aenderungen, repo.Ordner));

        Assert.That(patch, Is.EqualTo("@@ -0,0 +1,2 @@\n+a\0b\n+steal();\n"));
    }

    [TestCase("y.txt -diff")]
    [TestCase("y.txt binary")]
    public void Wenn_info_attributes_die_Datei_als_binaer_markiert_dann_zeigt_erst_der_Diff_als_Text_die_Zeilen(string attribut)
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei("y.txt", "eins\n");
        repo.Committe("p", "A", Zeitpunkt, "");
        repo.SchreibeDatei("y.txt", "eins\nsteal();\n");
        var q = repo.Committe("q", "A", Zeitpunkt, "");
        repo.SchreibeDatei(".git/info/attributes", $"{attribut}\n");
        var datei = new Dateiaenderung("M", "y.txt", null, null, null);
        Assert.That(PatchLesen(repo, q, datei), Is.Empty, "Kontrolle: info/attributes verbirgt die Änderung");

        var patch = Diffaufbereitung.PatchAbErstemHunk(GitLeser.DiffAlsTextLesen(q, datei, Diffumfang.Aenderungen, repo.Ordner));

        Assert.That(patch, Is.EqualTo("@@ -1 +1,2 @@\n eins\n+steal();\n"));
    }

    [TestCase("ohne Attribut", "unspecified")]
    [TestCase("info/attributes -diff", "unset")]
    [TestCase("info/attributes binary", "unset")]
    [TestCase("info/attributes diff=verbergen", "verbergen")]
    [TestCase(".gitattributes -diff", "unspecified")]
    [TestCase("config core.attributesFile", "unspecified")]
    public void Wenn_das_diff_Attribut_gelesen_wird_dann_gilt_nur_was_sich_nicht_abschalten_laesst(string quelle, string erwartet)
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei("-x\ny.txt", "eins\n");
        repo.Committe("p", "A", Zeitpunkt, "");
        var muster = "\"-x\\ny.txt\"";
        if (quelle.StartsWith("info/attributes ", StringComparison.Ordinal))
        {
            repo.SchreibeDatei(".git/info/attributes", $"{muster} {quelle["info/attributes ".Length..]}\n");
        }
        if (quelle == ".gitattributes -diff")
        {
            repo.SchreibeDatei(".gitattributes", $"{muster} -diff\n");
        }
        if (quelle == "config core.attributesFile")
        {
            Binaerausgabe.Einstellen(repo, quelle);
        }

        var attribut = GitLeser.DiffAttributLesen(new Dateiaenderung("A", "-x\ny.txt", null, null, null), repo.Ordner);

        Assert.That(attribut, Is.EqualTo(erwartet));
    }

    [Test]
    public void Wenn_die_Ausgabe_genau_die_Grenze_erreicht_dann_liest_git_sie_noch_und_ein_Byte_darueber_nicht()
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei("src/b.txt", "eins\nzwei\n");
        var p = repo.Committe("p", "A", Zeitpunkt, "");
        var datei = new Dateiaenderung("A", "src/b.txt", null, 2, 0);

        var vollstaendig = GitLeser.DiffLesen(p, datei, Diffumfang.Aenderungen, repo.Ordner, Ausgabegrenze.Standard);
        var grenze = Encoding.UTF8.GetByteCount(vollstaendig);

        var anDerGrenze = GitLeser.DiffLesen(p, datei, Diffumfang.Aenderungen, repo.Ordner, new Ausgabegrenze(grenze));

        Assert.That(Encoding.UTF8.GetByteCount(anDerGrenze), Is.EqualTo(grenze), "die Ausgabe genau an der Grenze wird vollständig gelesen");
        Assert.That(Diffaufbereitung.PatchAbErstemHunk(anDerGrenze), Is.EqualTo("@@ -0,0 +1,2 @@\n+eins\n+zwei\n"));
        Assert.Throws<GitZuGross>(() => GitLeser.DiffLesen(p, datei, Diffumfang.Aenderungen, repo.Ordner, new Ausgabegrenze(grenze - 1)));
    }

    [Test]
    public void Wenn_der_Netto_Diff_genau_die_Grenze_erreicht_dann_liest_git_ihn_noch_und_ein_Byte_darueber_nicht()
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei("src/b.txt", "eins\nzwei\n");
        var p = repo.Committe("p", "A", Zeitpunkt, "");
        var datei = new Dateiaenderung("A", "src/b.txt", null, 2, 0);

        var vollstaendig = GitLeser.NettoDiffLesen("", p, datei, Diffumfang.Aenderungen, repo.Ordner, Ausgabegrenze.Standard);
        var grenze = Encoding.UTF8.GetByteCount(vollstaendig);

        var anDerGrenze = GitLeser.NettoDiffLesen("", p, datei, Diffumfang.Aenderungen, repo.Ordner, new Ausgabegrenze(grenze));

        Assert.That(Encoding.UTF8.GetByteCount(anDerGrenze), Is.EqualTo(grenze), "die Ausgabe genau an der Grenze wird vollständig gelesen");
        Assert.That(Diffaufbereitung.PatchAbErstemHunk(anDerGrenze), Is.EqualTo("@@ -0,0 +1,2 @@\n+eins\n+zwei\n"));
        Assert.Throws<GitZuGross>(() => GitLeser.NettoDiffLesen("", p, datei, Diffumfang.Aenderungen, repo.Ordner, new Ausgabegrenze(grenze - 1)));
    }

    [Test]
    public void Wenn_das_Commit_Objekt_fehlt_dann_GitFehler_mit_Hash_und_Pfad()
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei("src/b.txt", "eins\n");
        var p = repo.Committe("p", "A", Zeitpunkt, "");
        File.Delete(Path.Combine(repo.Ordner, ".git", "objects", p[..2], p[2..]));

        var fehler = Assert.Throws<GitFehler>(() => GitLeser.DiffLesen(p, new Dateiaenderung("A", "src/b.txt", null, 1, 0), Diffumfang.Aenderungen, repo.Ordner));

        Assert.That(fehler.Message, Does.Contain(p).And.Contain("src/b.txt"));
    }

    [TestCase("diff.marker.textconv")]
    [TestCase("diff.marker.command")]
    [TestCase("diff.external")]
    [Platform(Exclude = "Win", Reason = "Marker-Programm ist ein Shell-Skript")]
    [UnsupportedOSPlatform("windows")]
    public void Wenn_das_Repo_ein_Diff_Programm_verlangt_dann_startet_das_Lesen_des_Diffs_das_Programm_nicht(string schluessel)
    {
        DiffProgrammBleibtAus(schluessel, PatchLesen);
    }

    [TestCase("diff.marker.textconv")]
    [TestCase("diff.marker.command")]
    [TestCase("diff.external")]
    [Platform(Exclude = "Win", Reason = "Marker-Programm ist ein Shell-Skript")]
    [UnsupportedOSPlatform("windows")]
    public void Wenn_das_Repo_ein_Diff_Programm_verlangt_dann_startet_das_Lesen_als_Text_das_Programm_nicht(string schluessel)
    {
        DiffProgrammBleibtAus(schluessel, (repo, hash, datei) => Diffaufbereitung.PatchAbErstemHunk(GitLeser.DiffAlsTextLesen(hash, datei, Diffumfang.Aenderungen, repo.Ordner)));
    }

    [TestCase("diff.marker.textconv")]
    [TestCase("diff.marker.command")]
    [TestCase("diff.external")]
    [Platform(Exclude = "Win", Reason = "Marker-Programm ist ein Shell-Skript")]
    [UnsupportedOSPlatform("windows")]
    public void Wenn_das_Repo_ein_Diff_Programm_verlangt_dann_startet_das_Lesen_der_ganzen_Datei_das_Programm_nicht(string schluessel)
    {
        DiffProgrammBleibtAus(schluessel, (repo, hash, datei) => Diffaufbereitung.PatchAbErstemHunk(GitLeser.DiffLesen(hash, datei, Diffumfang.Ganz, repo.Ordner)));
        DiffProgrammBleibtAus(schluessel, (repo, hash, datei) => Diffaufbereitung.PatchAbErstemHunk(GitLeser.DiffAlsTextLesen(hash, datei, Diffumfang.Ganz, repo.Ordner)));
    }

    [Test]
    public void Wenn_ganze_Datei_dann_ein_Abschnitt_ueber_alle_Zeilen_auch_wenn_das_Repo_den_Kontext_auf_null_setzt()
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei("lang.txt", Zeilen(1, 20));
        repo.Committe("p", "A", Zeitpunkt, "");
        repo.SchreibeDatei("lang.txt", Zeilen(1, 20).Replace("z03\n", "Z03\n").Replace("z18\n", ""));
        var q = repo.Committe("q", "A", Zeitpunkt, "");
        repo.Git("config", "diff.context", "0");
        var datei = new Dateiaenderung("M", "lang.txt", null, 1, 2);

        var patch = Diffaufbereitung.PatchAbErstemHunk(GitLeser.DiffLesen(q, datei, Diffumfang.Ganz, repo.Ordner));
        var alsText = Diffaufbereitung.PatchAbErstemHunk(GitLeser.DiffAlsTextLesen(q, datei, Diffumfang.Ganz, repo.Ordner));

        Assert.That(patch, Is.EqualTo(
            "@@ -1,20 +1,19 @@\n z01\n z02\n-z03\n+Z03\n z04\n z05\n z06\n z07\n z08\n z09\n z10\n z11\n z12\n z13\n z14\n z15\n z16\n z17\n-z18\n z19\n z20\n"));
        Assert.That(alsText, Is.EqualTo(patch));
    }

    [Test]
    public void Wenn_ganze_Datei_nicht_lesbar_dann_Fehler_mit_Hash_und_Pfad()
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei("src/b.txt", "eins\n");
        var p = repo.Committe("p", "A", Zeitpunkt, "");
        File.Delete(Path.Combine(repo.Ordner, ".git", "objects", p[..2], p[2..]));

        var fehler = Assert.Throws<GitFehler>(() => GitLeser.DiffLesen(p, new Dateiaenderung("A", "src/b.txt", null, 1, 0), Diffumfang.Ganz, repo.Ordner));

        Assert.That(fehler.Message, Does.Contain(p).And.Contain("src/b.txt"));
    }

    [UnsupportedOSPlatform("windows")]
    private static void DiffProgrammBleibtAus(string schluessel, Func<WegwerfRepo, string, Dateiaenderung, string> lesen)
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei(".gitattributes", "*.txt diff=marker\n");
        repo.SchreibeDatei("src/b.txt", "eins\nzwei\n");
        repo.Committe("p", "A", Zeitpunkt, "");
        repo.SchreibeDatei("src/b.txt", "eins\nZWEI\n");
        var q = repo.Committe("q", "A", Zeitpunkt, "");
        var marker = Path.Combine(repo.Ordner, ".git", "marker.txt");
        repo.Git("config", schluessel, MarkerProgrammAnlegen(repo, marker));

        var patch = lesen(repo, q, new Dateiaenderung("M", "src/b.txt", null, 1, 1));

        Assert.That(patch, Is.EqualTo("@@ -1,2 +1,2 @@\n eins\n-zwei\n+ZWEI\n"));
        Assert.That(File.Exists(marker), Is.False, "das Programm aus der Konfiguration des Repos lief");
        repo.Git("diff", $"{q}~", q);
        Assert.That(File.Exists(marker), Is.True, "Kontrolle: das Marker-Programm ist über git diff aufrufbar");
    }

    private static string PatchLesen(WegwerfRepo repo, string hash, Dateiaenderung datei)
    {
        return Diffaufbereitung.PatchAbErstemHunk(GitLeser.DiffLesen(hash, datei, Diffumfang.Aenderungen, repo.Ordner));
    }

    private static string Zeilen(int von, int bis)
    {
        var zeilen = Enumerable.Range(von, bis - von + 1).Select(nummer => $"z{nummer:00}\n");
        return string.Concat(zeilen);
    }

    [UnsupportedOSPlatform("windows")]
    private static string MarkerProgrammAnlegen(WegwerfRepo repo, string marker)
    {
        var programm = Path.Combine(repo.Ordner, ".git", "marker.sh");
        File.WriteAllText(programm, $"#!/bin/sh\necho \"$@\" >> '{marker}'\ncat \"$1\" 2>/dev/null\n");
        File.SetUnixFileMode(programm, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        return programm;
    }
}
