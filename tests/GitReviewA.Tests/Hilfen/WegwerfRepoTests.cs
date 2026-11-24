namespace GitReviewA.Tests.Hilfen;

public class WegwerfRepoTests
{
    [Test]
    public void Wenn_Repo_mit_Betreffen_angelegt_dann_traegt_jeder_Hash_seinen_Betreff()
    {
        using var repo = WegwerfRepo.MitCommits("Erster Commit", "Zweiter Commit");

        var betreffDesZweiten = repo.Git("log", "-1", "--format=%s", repo.Hashes[1]);

        Assert.That(repo.Hashes, Has.Count.EqualTo(2));
        Assert.That(repo.Hashes[0], Does.Match("^[0-9a-f]{40}$"));
        Assert.That(betreffDesZweiten, Is.EqualTo("Zweiter Commit"));
    }

    [Test]
    public void Wenn_Repo_entsorgt_dann_ist_sein_Ordner_weg()
    {
        var repo = WegwerfRepo.MitCommits("Erster Commit");
        var ordner = repo.Ordner;

        repo.Dispose();

        Assert.That(Directory.Exists(ordner), Is.False);
    }
}
