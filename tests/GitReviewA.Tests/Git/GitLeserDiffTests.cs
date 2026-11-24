using System.Runtime.Versioning;
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
        repo.Git("config", "diff.interHunkContext", "10");

        var patch = PatchLesen(repo, q, new Dateiaenderung("M", "k.txt", null, 1, 1));

        Assert.That(patch, Is.EqualTo("@@ -1,3 +1,3 @@\n oben\n \n-unten\n+UNTEN\n"));
    }

    [Test]
    public void Wenn_gitmodules_Aenderungen_ignorieren_laesst_dann_zeigt_der_Diff_den_Submodul_Stand_trotzdem()
    {
        using var repo = WegwerfRepo.MitCommits("eins", "zwei");
        var vorher = repo.Hashes[0];
        var nachher = repo.Hashes[1];
        repo.SchreibeDatei(".gitmodules", "[submodule \"sub\"]\n\tpath = sub\n\turl = ./sub\n\tignore = all\n");
        repo.Git("add", ".gitmodules");
        repo.Git("update-index", "--add", "--cacheinfo", $"160000,{vorher},sub");
        repo.Git("commit", "-q", "-m", "Submodul");
        repo.Git("update-index", "--cacheinfo", $"160000,{nachher},sub");
        repo.Git("commit", "-q", "-m", "Submodul anheben");
        var bump = repo.Git("rev-parse", "HEAD");

        var patch = PatchLesen(repo, bump, new Dateiaenderung("M", "sub", null, 1, 1));

        Assert.That(patch, Is.EqualTo($"@@ -1 +1 @@\n-Subproject commit {vorher}\n+Subproject commit {nachher}\n"));
    }

    [Test]
    public void Wenn_das_Commit_Objekt_fehlt_dann_GitFehler_mit_Hash_und_Pfad()
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei("src/b.txt", "eins\n");
        var p = repo.Committe("p", "A", Zeitpunkt, "");
        File.Delete(Path.Combine(repo.Ordner, ".git", "objects", p[..2], p[2..]));

        var fehler = Assert.Throws<GitFehler>(() => GitLeser.DiffLesen(p, new Dateiaenderung("A", "src/b.txt", null, 1, 0), repo.Ordner));

        Assert.That(fehler.Message, Does.Contain(p).And.Contain("src/b.txt"));
    }

    [TestCase("diff.marker.textconv")]
    [TestCase("diff.marker.command")]
    [TestCase("diff.external")]
    [Platform(Exclude = "Win", Reason = "Marker-Programm ist ein Shell-Skript")]
    [UnsupportedOSPlatform("windows")]
    public void Wenn_das_Repo_ein_Diff_Programm_verlangt_dann_startet_das_Lesen_des_Diffs_das_Programm_nicht(string schluessel)
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei(".gitattributes", "*.txt diff=marker\n");
        repo.SchreibeDatei("src/b.txt", "eins\nzwei\n");
        repo.Committe("p", "A", Zeitpunkt, "");
        repo.SchreibeDatei("src/b.txt", "eins\nZWEI\n");
        var q = repo.Committe("q", "A", Zeitpunkt, "");
        var marker = Path.Combine(repo.Ordner, ".git", "marker.txt");
        repo.Git("config", schluessel, MarkerProgrammAnlegen(repo, marker));

        var patch = PatchLesen(repo, q, new Dateiaenderung("M", "src/b.txt", null, 1, 1));

        Assert.That(patch, Is.EqualTo("@@ -1,2 +1,2 @@\n eins\n-zwei\n+ZWEI\n"));
        Assert.That(File.Exists(marker), Is.False, "das Programm aus der Konfiguration des Repos lief");
        repo.Git("diff", $"{q}~", q);
        Assert.That(File.Exists(marker), Is.True, "Kontrolle: das Marker-Programm ist über git diff aufrufbar");
    }

    private static string PatchLesen(WegwerfRepo repo, string hash, Dateiaenderung datei)
    {
        return Diffaufbereitung.PatchAbErstemHunk(GitLeser.DiffLesen(hash, datei, repo.Ordner));
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
