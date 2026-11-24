using GitReviewA.Aufruf;
using GitReviewA.Git;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Git;

public class GitLeserBereicheTests
{
    [Test]
    public void Wenn_Bereich_b_bis_e_dann_e_d_c_neuester_zuerst_ohne_b()
    {
        using var repo = WegwerfRepo.MitCommits("Erster Commit", "Zweiter Commit", "Dritter Commit", "Vierter Commit", "Fünfter Commit");
        var (b, c, d, e) = (repo.Hashes[1], repo.Hashes[2], repo.Hashes[3], repo.Hashes[4]);

        var zeilen = GitLeser.LeseBereiche(new Bereiche([$"{b}..{e}"]), repo.Ordner).AlsArray();

        Assert.That(zeilen, Is.EqualTo(new[]
        {
            new Commitzeile(e, "Fünfter Commit"),
            new Commitzeile(d, "Vierter Commit"),
            new Commitzeile(c, "Dritter Commit"),
        }));
    }

    [Test]
    public void Wenn_Bereich_ueber_Zweig_und_Merge_dann_dieselbe_Liste_wie_git_rev_list()
    {
        using var repo = WegwerfRepo.MitCommits("a");
        var a = repo.Hashes[0];
        repo.Git("checkout", "-q", "-b", "feature");
        repo.LeererCommit("f1");
        repo.LeererCommit("f2");
        repo.Git("checkout", "-q", "main");
        repo.LeererCommit("b");
        var m = repo.Merge("feature", "m");

        var gelesen = GitLeser.LeseBereiche(new Bereiche([$"{a}..{m}"]), repo.Ordner).AlsArray().Select(zeile => zeile.Hash);

        var vonGit = repo.Git("rev-list", $"{a}..{m}").Split('\n');
        Assert.That(vonGit, Has.Length.EqualTo(4));
        Assert.That(gelesen, Is.EqualTo(vonGit));
    }

    [Test]
    public void Wenn_Zweignamen_und_fehlender_Anfang_dann_wie_git()
    {
        using var repo = WegwerfRepo.MitCommits("a", "b");
        repo.Git("checkout", "-q", "-b", "feature");
        var f1 = repo.LeererCommit("f1");
        var f2 = repo.LeererCommit("f2");
        repo.Git("checkout", "-q", "main");

        var mitNamen = GitLeser.LeseBereiche(new Bereiche(["main..feature"]), repo.Ordner).AlsArray().Select(zeile => zeile.Hash);
        var ohneAnfang = GitLeser.LeseBereiche(new Bereiche(["..feature"]), repo.Ordner).AlsArray().Select(zeile => zeile.Hash);

        Assert.That(mitNamen, Is.EqualTo(new[] { f2, f1 }));
        Assert.That(ohneAnfang, Is.EqualTo(new[] { f2, f1 }));
    }

    [Test]
    public void Wenn_zwei_Bereiche_dann_Vereinigung_neuester_zuerst()
    {
        using var repo = WegwerfRepo.MitCommits("a", "b", "c", "d", "e");
        var h = repo.Hashes;

        var zeilen = GitLeser.LeseBereiche(new Bereiche([$"{h[0]}..{h[1]}", $"{h[3]}..{h[4]}", "HEAD~1.."]), repo.Ordner).AlsArray().Select(zeile => zeile.Hash);

        Assert.That(zeilen, Is.EqualTo(new[] { h[4], h[1] }));
    }

    [Test]
    public void Wenn_zwei_Bereiche_mit_gleichen_Commit_Zeiten_dann_Reihenfolge_unabhaengig_von_der_Argumentreihenfolge()
    {
        using var repo = WegwerfRepo.MitCommitsZurSelbenZeit("a", "b", "c", "d", "e");
        var h = repo.Hashes;

        var abZuerst = GitLeser.LeseBereiche(new Bereiche([$"{h[0]}..{h[1]}", $"{h[3]}..{h[4]}"]), repo.Ordner).AlsArray().Select(zeile => zeile.Hash);
        var deZuerst = GitLeser.LeseBereiche(new Bereiche([$"{h[3]}..{h[4]}", $"{h[0]}..{h[1]}"]), repo.Ordner).AlsArray().Select(zeile => zeile.Hash);

        Assert.That(abZuerst, Is.EqualTo(new[] { h[4], h[1] }));
        Assert.That(deZuerst, Is.EqualTo(new[] { h[4], h[1] }));
    }

    [Test]
    public void Wenn_zwei_Bereiche_ueber_Zweig_und_Merge_mit_gleichen_Zeiten_dann_Kind_vor_Eltern_wie_git()
    {
        using var repo = WegwerfRepo.MitCommitsZurSelbenZeit("a");
        var a = repo.Hashes[0];
        repo.Git("checkout", "-q", "-b", "feature");
        var f1 = repo.LeererCommit("f1");
        var f2 = repo.LeererCommit("f2");
        repo.Git("checkout", "-q", "main");
        var b = repo.LeererCommit("b");
        var m = repo.Merge("feature", "m");

        var featureZuerst = GitLeser.LeseBereiche(new Bereiche([$"{a}..{f2}", $"{f2}..{m}"]), repo.Ordner).AlsArray().Select(zeile => zeile.Hash).ToArray();
        var mergeZuerst = GitLeser.LeseBereiche(new Bereiche([$"{f2}..{m}", $"{a}..{f2}"]), repo.Ordner).AlsArray().Select(zeile => zeile.Hash).ToArray();

        var vonGit = repo.Git("rev-list", "--date-order", $"{a}..{m}").Split('\n');
        Assert.That(featureZuerst, Is.EqualTo(vonGit));
        Assert.That(mergeZuerst, Is.EqualTo(vonGit));
        Assert.That(Array.IndexOf(featureZuerst, m), Is.LessThan(Array.IndexOf(featureZuerst, f2)));
        Assert.That(Array.IndexOf(featureZuerst, m), Is.LessThan(Array.IndexOf(featureZuerst, b)));
        Assert.That(Array.IndexOf(featureZuerst, f2), Is.LessThan(Array.IndexOf(featureZuerst, f1)));
    }

    [Test]
    public void Wenn_zwei_Bereiche_ohne_gemeinsamen_Vorfahren_dann_beide_Commits_unabhaengig_von_der_Argumentreihenfolge()
    {
        using var repo = WegwerfRepo.MitCommitsZurSelbenZeit("a", "b");
        var (a, b) = (repo.Hashes[0], repo.Hashes[1]);
        repo.Git("checkout", "-q", "--orphan", "fremd");
        var x1 = repo.LeererCommit("x1");
        var x2 = repo.LeererCommit("x2");

        var mainZuerst = GitLeser.LeseBereiche(new Bereiche([$"{a}..{b}", $"{x1}..{x2}"]), repo.Ordner).AlsArray().Select(zeile => zeile.Hash).ToArray();
        var fremdZuerst = GitLeser.LeseBereiche(new Bereiche([$"{x1}..{x2}", $"{a}..{b}"]), repo.Ordner).AlsArray().Select(zeile => zeile.Hash).ToArray();

        Assert.That(mainZuerst, Is.EquivalentTo(new[] { b, x2 }));
        Assert.That(fremdZuerst, Is.EqualTo(mainZuerst));
    }

    [Test]
    public void Wenn_Bereich_mehr_als_1000_Commits_dann_liest_git_nur_1001_als_Beleg_fuer_die_Grenze()
    {
        using var repo = WegwerfRepo.MitVielenCommits(1500);

        var zeilen = GitLeser.LeseBereiche(new Bereiche([$"{repo.Hashes[0]}..HEAD"]), repo.Ordner);

        Assert.That(zeilen.Anzahl, Is.EqualTo(Auswahlgrenze.Hoechstzahl + 1));
        Assert.That(zeilen[0].Hash, Is.EqualTo(repo.Hashes[1500]));
    }

    [Test]
    public void Wenn_mehrere_Bereiche_zusammen_mehr_als_1000_Commits_dann_liest_git_nur_1001()
    {
        using var repo = WegwerfRepo.MitVielenCommits(1500);
        var mitte = repo.Hashes[700];

        var zeilen = GitLeser.LeseBereiche(new Bereiche([$"{repo.Hashes[0]}..{mitte}", $"{mitte}..HEAD"]), repo.Ordner);

        Assert.That(zeilen.Anzahl, Is.EqualTo(Auswahlgrenze.Hoechstzahl + 1));
    }

    [Test]
    public void Wenn_Bereich_genau_1000_Commits_dann_alle_1000()
    {
        using var repo = WegwerfRepo.MitVielenCommits(1000);

        var zeilen = GitLeser.LeseBereiche(new Bereiche([$"{repo.Hashes[0]}..HEAD"]), repo.Ordner);

        Assert.That(zeilen.Anzahl, Is.EqualTo(1000));
    }

    [Test]
    public void Wenn_Bereich_wie_eine_Option_aussieht_dann_nimmt_git_ihn_als_Revision_und_nicht_als_Option()
    {
        using var repo = WegwerfRepo.MitCommits("Erster Commit");
        var zieldatei = Path.Combine(repo.Ordner, "geschrieben.txt");

        Assert.Throws<GitFehler>(() => GitLeser.LeseBereiche(new Bereiche([$"--output={zieldatei}..HEAD"]), repo.Ordner));

        Assert.That(File.Exists(zieldatei), Is.False);
    }
}
