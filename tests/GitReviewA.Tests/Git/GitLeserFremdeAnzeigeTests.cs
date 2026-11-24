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
