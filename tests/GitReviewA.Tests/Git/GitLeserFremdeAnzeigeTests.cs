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
    public void Wenn_der_Ordner_in_keinem_Repo_liegt_dann_GitFehler()
    {
        var ordner = Directory.CreateTempSubdirectory("gitreviewa-kein-repo-").FullName;
        try
        {
            Assert.Throws<GitFehler>(() => GitLeser.WurzelLesen(ordner));
        }
        finally
        {
            Directory.Delete(ordner, recursive: true);
        }
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
