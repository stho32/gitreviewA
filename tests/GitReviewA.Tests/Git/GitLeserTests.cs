using GitReviewA.Aufruf;
using GitReviewA.Git;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Git;

public class GitLeserTests
{
    [Test]
    public void Wenn_Hashes_ausser_der_Reihe_dann_Commitzeilen_in_Aufrufreihenfolge_und_nur_diese()
    {
        using var repo = WegwerfRepo.MitCommits("Erster Commit", "Zweiter Commit", "Dritter Commit", "Vierter Commit");

        var zeilen = GitLeser.Lesen(new CommitHashes([repo.Hashes[0], repo.Hashes[2], repo.Hashes[1]]), repo.Ordner).AlsArray();

        Assert.That(zeilen, Is.EqualTo(new[]
        {
            new Commitzeile(repo.Hashes[0], "Erster Commit"),
            new Commitzeile(repo.Hashes[2], "Dritter Commit"),
            new Commitzeile(repo.Hashes[1], "Zweiter Commit"),
        }));
    }

    [Test]
    public void Wenn_Hash_abgekuerzt_dann_voller_Hash_in_der_Commitzeile()
    {
        using var repo = WegwerfRepo.MitCommits("Erster Commit", "Zweiter Commit");
        var abgekuerzt = repo.Git("rev-parse", "--short=12", repo.Hashes[1]);

        var zeilen = GitLeser.Lesen(new CommitHashes([abgekuerzt]), repo.Ordner).AlsArray();

        Assert.That(zeilen, Is.EqualTo(new[] { new Commitzeile(repo.Hashes[1], "Zweiter Commit") }));
    }

    [Test]
    public void Wenn_Betreff_HTML_und_Umlaute_enthaelt_dann_unveraendert_gelesen()
    {
        using var repo = WegwerfRepo.MitCommits("<script>alert(1)</script> „Größe“ ändern");

        var zeilen = GitLeser.Lesen(new CommitHashes([repo.Hashes[0]]), repo.Ordner).AlsArray();

        Assert.That(zeilen.Single().Betreff, Is.EqualTo("<script>alert(1)</script> „Größe“ ändern"));
    }

    [Test]
    public void Wenn_Hash_unbekannt_dann_GitFehler_mit_Meldung_von_git()
    {
        using var repo = WegwerfRepo.MitCommits("Erster Commit");

        var fehler = Assert.Throws<GitFehler>(() => GitLeser.Lesen(new CommitHashes(["deadbeefdeadbeef"]), repo.Ordner));

        Assert.That(fehler.Message, Is.Not.Empty);
    }

    [Test]
    public void Wenn_ein_Eintrag_wie_eine_Option_aussieht_dann_nimmt_git_ihn_als_Revision_und_nicht_als_Option()
    {
        using var repo = WegwerfRepo.MitCommits("Erster Commit");
        var zieldatei = Path.Combine(repo.Ordner, "geschrieben.txt");

        Assert.Throws<GitFehler>(() => GitLeser.Lesen(new CommitHashes([$"--output={zieldatei}", repo.Hashes[0]]), repo.Ordner));

        Assert.That(File.Exists(zieldatei), Is.False);
    }
}
