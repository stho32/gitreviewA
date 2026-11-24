using GitReviewA.Aufruf;
using GitReviewA.Git;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Git;

/// <summary>Das geprüfte Repo ist fremd: seine Einstellungen und Refs dürfen nicht verbergen oder vertauschen, was der Commit wirklich enthält.</summary>
public class GitLeserFremdeAnzeigeTests
{
    [TestCase("ohne Ausblendung")]
    [TestCase(".gitmodules submodule.sub.ignore=all")]
    [TestCase("config submodule.sub.ignore=all")]
    [TestCase("config diff.ignoreSubmodules=all")]
    public void Wenn_das_Repo_Submodul_Aenderungen_ausblendet_dann_zeigt_die_Dateiliste_das_Submodul_trotzdem(string ausblendung)
    {
        using var repo = WegwerfRepo.MitCommits("Stand X", "Stand Y");
        var gitmodules = "[submodule \"sub\"]\n\tpath = sub\n\turl = ./sub\n";
        if (ausblendung == ".gitmodules submodule.sub.ignore=all")
        {
            gitmodules += "\tignore = all\n";
        }
        repo.SchreibeDatei(".gitmodules", gitmodules);
        repo.SchreibeDatei("a.txt", "eins\n");
        repo.Git("add", ".gitmodules", "a.txt");
        repo.Git("update-index", "--add", "--cacheinfo", $"160000,{repo.Hashes[0]},sub");
        repo.Git("commit", "-q", "-m", "Submodul anlegen");
        repo.SchreibeDatei("a.txt", "eins\nzwei\n");
        repo.Git("add", "a.txt");
        repo.Git("update-index", "--cacheinfo", $"160000,{repo.Hashes[1]},sub");
        repo.Git("commit", "-q", "-m", "Submodul heben");
        var hash = repo.Git("rev-parse", "HEAD");
        StelleAusblendungEin(repo, ausblendung);

        var dateien = GitLeser.DateienLesen(hash, repo.Ordner).AlsArray();

        Assert.That(dateien.Select(datei => (datei.Status, datei.Pfad)), Is.EquivalentTo(new[] { ("M", "a.txt"), ("M", "sub") }));
    }

    [Test]
    public void Wenn_das_Repo_einen_Commit_per_refs_replace_ersetzt_dann_zeigen_Leiste_und_Dateiliste_den_echten_Commit()
    {
        using var repo = WegwerfRepo.MitCommits("Erster Commit");
        repo.SchreibeDatei("evil.sh", "#!/bin/sh\n");
        var echt = repo.Committe("Nur Doku", "Mallory", "2026-03-04T09:15:00+01:00", "");
        repo.SchreibeDatei("README.md", "harmlos\n");
        var falsch = repo.Committe("Fake", "Maintainer", "2026-03-04T09:16:00+01:00", "");
        repo.Git("replace", "-f", echt, falsch);
        Assert.That(repo.Git("log", "-1", "--format=%s / %an", echt), Is.EqualTo("Fake / Maintainer"), "Kontrolle: die Ersatzref wirkt für git");

        var zeilen = GitLeser.Lesen(new CommitHashes([echt]), repo.Ordner).AlsArray();
        var dateien = GitLeser.DateienLesen(echt, repo.Ordner).AlsArray();

        Assert.That(zeilen.Select(zeile => (zeile.Hash, zeile.Betreff, zeile.Autor)), Is.EqualTo(new[] { (echt, "Nur Doku", "Mallory") }));
        Assert.That(dateien.Select(datei => (datei.Status, datei.Pfad)), Is.EqualTo(new[] { ("A", "evil.sh") }));
    }

    [TestCase("Wurzel", false)]
    [TestCase("Wurzel", true)]
    [TestCase("unten", false)]
    [TestCase("unten", true)]
    public void Wenn_aus_einem_Ordner_des_Repos_gelesen_wird_dann_zeigt_die_Dateiliste_alle_Pfade_ab_der_Wurzel(string startordner, bool pfadeRelativ)
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei("a.txt", "eins\n");
        repo.SchreibeDatei("unten/b.txt", "zwei\n");
        var hash = repo.Committe("Zwei Ordner", "A", "2026-03-04T09:15:00+01:00", "");
        repo.Git("config", "diff.relative", pfadeRelativ.ToString().ToLowerInvariant());
        var arbeitsordner = repo.Ordner;
        if (startordner == "unten")
        {
            arbeitsordner = Path.Combine(repo.Ordner, "unten");
        }

        var dateien = GitLeser.DateienLesen(hash, arbeitsordner).AlsArray();

        Assert.That(dateien.Select(datei => datei.Pfad), Is.EquivalentTo(new[] { "a.txt", "unten/b.txt" }));
    }

    [TestCase("Wurzel")]
    [TestCase("unten")]
    [TestCase("unten/tiefer")]
    public void Wenn_die_Wurzel_aus_einem_Ordner_des_Repos_gelesen_wird_dann_ist_es_der_oberste_Ordner_des_Arbeitsbaums(string startordner)
    {
        using var repo = WegwerfRepo.MitCommits("Erster Commit");
        Directory.CreateDirectory(Path.Combine(repo.Ordner, "unten", "tiefer"));
        var ordner = repo.Ordner;
        if (startordner != "Wurzel")
        {
            ordner = Path.Combine(repo.Ordner, startordner);
        }

        var wurzel = GitLeser.WurzelLesen(ordner);

        Assert.That(Path.GetFullPath(wurzel), Is.EqualTo(Path.GetFullPath(repo.Ordner)));
    }

    [Test]
    public void Wenn_der_Ordner_in_keinem_Repo_liegt_dann_Aufruffehler_kein_Repository()
    {
        var ordner = Directory.CreateTempSubdirectory("gitreviewa-kein-repo-").FullName;
        try
        {
            var fehler = Assert.Throws<Aufruffehler>(() => GitLeser.WurzelLesen(ordner));

            Assert.That(fehler.Grund, Is.EqualTo(Aufrufgrund.KeinRepository));
        }
        finally
        {
            Directory.Delete(ordner, recursive: true);
        }
    }

    [TestCase("ohne Abschaltung")]
    [TestCase(".gitattributes -diff")]
    [TestCase(".gitattributes binary")]
    [TestCase(".gitattributes Treiber mit binary=true")]
    [TestCase("config core.bigFileThreshold=1")]
    [TestCase("config core.attributesFile")]
    public void Wenn_das_Repo_Textdateien_als_binaer_ausgibt_dann_zeigt_die_Dateiliste_trotzdem_die_Zeilenzahlen(string abschaltung)
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei("a.txt", "eins\n");
        repo.Committe("Erster", "A", "2026-03-04T09:15:00+01:00", "");
        repo.SchreibeDatei("a.txt", "eins\nzwei\n");
        var hash = repo.Committe("Zweiter", "A", "2026-03-04T09:16:00+01:00", "");
        Binaerausgabe.Einstellen(repo, abschaltung);

        var dateien = GitLeser.DateienLesen(hash, repo.Ordner).AlsArray();

        Assert.That(dateien, Is.EqualTo(new[] { new Dateiaenderung("M", "a.txt", null, 1, 0) }));
    }

    [Test]
    public void Wenn_eine_Datei_wirklich_binaer_ist_dann_zeigt_die_Dateiliste_weiter_keine_Zeilenzahlen()
    {
        using var repo = WegwerfRepo.MitCommits();
        File.WriteAllBytes(Path.Combine(repo.Ordner, "logo.bin"), [0, 1, 2, 3, 0, 255]);
        var hash = repo.Committe("Bild", "A", "2026-03-04T09:15:00+01:00", "");

        var dateien = GitLeser.DateienLesen(hash, repo.Ordner).AlsArray();

        Assert.That(dateien, Is.EqualTo(new[] { new Dateiaenderung("A", "logo.bin", null, null, null) }));
    }

    [TestCase("ohne Einstellung")]
    [TestCase("log.showRoot=false")]
    public void Wenn_das_Repo_den_Wurzelcommit_ohne_Diff_zeigen_will_dann_zeigen_Dateiliste_und_Diff_ihn_trotzdem(string einstellung)
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei("a.txt", "eins\n");
        var wurzel = repo.Committe("Wurzel", "A", "2026-03-04T09:15:00+01:00", "");
        StelleEin(repo, einstellung);

        var dateien = GitLeser.DateienLesen(wurzel, repo.Ordner).AlsArray();
        var diff = GitLeser.DiffLesen(wurzel, new Dateiaenderung("A", "a.txt", null, 1, 0), Diffumfang.Aenderungen, repo.Ordner);

        Assert.That(dateien, Is.EqualTo(new[] { new Dateiaenderung("A", "a.txt", null, 1, 0) }));
        Assert.That(diff, Does.Contain("+eins"));
    }

    [TestCase("ohne Einstellung")]
    [TestCase("log.diffMerges=combined")]
    [TestCase("log.diffMerges=dense-combined")]
    [TestCase("log.diffMerges=remerge")]
    [TestCase("log.diffMerges=separate")]
    public void Wenn_das_Repo_Merges_anders_zeigen_will_dann_zeigen_Dateiliste_und_Diff_den_Merge_gegen_den_ersten_Elternteil(string einstellung)
    {
        using var repo = WegwerfRepo.MitCommits("Basis");
        repo.Git("checkout", "-q", "-b", "seite");
        repo.SchreibeDatei("seite.txt", "von der Seite\n");
        repo.Committe("Seite", "A", "2026-03-06T08:00:00+01:00", "");
        repo.Git("checkout", "-q", "main");
        repo.SchreibeDatei("haupt.txt", "auf main\n");
        repo.Committe("Haupt", "A", "2026-03-06T08:01:00+01:00", "");
        var merge = repo.Merge("seite", "Merge");
        StelleEin(repo, einstellung);

        var dateien = GitLeser.DateienLesen(merge, repo.Ordner).AlsArray();
        var diff = GitLeser.DiffLesen(merge, new Dateiaenderung("A", "seite.txt", null, 1, 0), Diffumfang.Aenderungen, repo.Ordner);

        Assert.That(dateien, Is.EqualTo(new[] { new Dateiaenderung("A", "seite.txt", null, 1, 0) }));
        Assert.That(diff, Does.Contain("+von der Seite"));
    }

    private static void StelleEin(WegwerfRepo repo, string einstellung)
    {
        var ohneEinstellung = einstellung == "ohne Einstellung";
        if (ohneEinstellung)
        {
            return;
        }
        var teile = einstellung.Split('=');
        repo.Git("config", teile[0], teile[1]);
    }

    private static void StelleAusblendungEin(WegwerfRepo repo, string ausblendung)
    {
        if (ausblendung == "config submodule.sub.ignore=all")
        {
            repo.Git("config", "submodule.sub.ignore", "all");
        }
        if (ausblendung == "config diff.ignoreSubmodules=all")
        {
            repo.Git("config", "diff.ignoreSubmodules", "all");
        }
    }
}
