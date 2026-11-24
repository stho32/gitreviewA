using GitReviewA.Git;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Git;

public class GitLeserDateienTests
{
    [Test]
    public void Wenn_Wurzelcommit_dann_alle_Dateien_A_mit_Zeilenzahl_in_git_Reihenfolge()
    {
        using var repo = WegwerfRepo.MitCommits();
        var p = VorbereitungP(repo);

        var dateien = GitLeser.DateienLesen(p, repo.Ordner).AlsArray();

        Assert.That(dateien, Is.EqualTo(new[]
        {
            new Dateiaenderung("A", "README.md", null, 2, 0),
            new Dateiaenderung("A", "alt.txt", null, 4, 0),
            new Dateiaenderung("A", "src/a.txt", null, 3, 0),
            new Dateiaenderung("A", "src/b.txt", null, 2, 0),
        }));
    }

    [Test]
    public void Wenn_geaendert_geloescht_umbenannt_und_binaer_dann_M_D_R_und_A_ohne_Zahlen()
    {
        using var repo = WegwerfRepo.MitCommits();
        VorbereitungP(repo);
        repo.Git("mv", "README.md", "LIESMICH.md");
        File.Delete(Path.Combine(repo.Ordner, "alt.txt"));
        repo.SchreibeDatei("src/b.txt", "x\nY\nz\n");
        File.WriteAllBytes(Path.Combine(repo.Ordner, "logo.bin"), [0, 1, 2, 3, 0, 255]);
        var q = repo.Committe("Dateien ändern", "Bernd Beispiel", "2026-03-05T18:30:00+01:00", "Zeile eins\nZeile zwei");

        var dateien = GitLeser.DateienLesen(q, repo.Ordner).AlsArray();

        Assert.That(dateien.OrderBy(datei => datei.Pfad, StringComparer.Ordinal), Is.EqualTo(new[]
        {
            new Dateiaenderung("R", "LIESMICH.md", "README.md", 0, 0),
            new Dateiaenderung("D", "alt.txt", null, 0, 4),
            new Dateiaenderung("A", "logo.bin", null, null, null),
            new Dateiaenderung("M", "src/b.txt", null, 2, 1),
        }));
    }

    [Test]
    public void Wenn_Commit_leer_dann_keine_Dateien()
    {
        using var repo = WegwerfRepo.MitCommits("Erster Commit");
        var leer = repo.Committe("Nichts", "A", "2026-03-06T08:00:00+01:00", "");

        var dateien = GitLeser.DateienLesen(leer, repo.Ordner);

        Assert.That(dateien.Anzahl, Is.Zero);
    }

    [Test]
    public void Wenn_Pfade_Umlaute_Leerzeichen_und_spitze_Klammern_tragen_dann_unmaskiert()
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei("ä ö.txt", "eins\n");
        repo.SchreibeDatei("<b>fett</b>.txt", "zwei\n");
        var t = repo.Committe("Sonderzeichen", "A", "2026-03-06T08:00:00+01:00", "");

        var pfade = GitLeser.DateienLesen(t, repo.Ordner).AlsArray().Select(datei => datei.Pfad).Order(StringComparer.Ordinal);

        Assert.That(pfade, Is.EqualTo(new[] { "<b>fett</b>.txt", "ä ö.txt" }));
    }

    [Test]
    public void Wenn_Merge_Commit_dann_Aenderungen_gegenueber_dem_ersten_Elternteil()
    {
        using var repo = WegwerfRepo.MitCommits("Basis");
        repo.Git("checkout", "-q", "-b", "seite");
        repo.SchreibeDatei("seite.txt", "von der Seite\n");
        repo.Committe("Seite", "A", "2026-03-06T08:00:00+01:00", "");
        repo.Git("checkout", "-q", "main");
        repo.SchreibeDatei("haupt.txt", "auf main\n");
        repo.Committe("Haupt", "A", "2026-03-06T08:01:00+01:00", "");
        repo.Git("merge", "-q", "--no-edit", "seite");
        var merge = repo.Git("rev-parse", "HEAD");

        var dateien = GitLeser.DateienLesen(merge, repo.Ordner).AlsArray();

        Assert.That(dateien, Is.EqualTo(new[] { new Dateiaenderung("A", "seite.txt", null, 1, 0) }));
    }

    [Test]
    public void Wenn_Objekt_des_Commits_fehlt_dann_GitFehler_mit_Hash()
    {
        using var repo = WegwerfRepo.MitCommits("Erster Commit", "Zweiter Commit");
        var hash = repo.Hashes[1];
        File.Delete(Path.Combine(repo.Ordner, ".git", "objects", hash[..2], hash[2..]));

        var fehler = Assert.Throws<GitFehler>(() => GitLeser.DateienLesen(hash, repo.Ordner));

        Assert.That(fehler.Message, Does.Contain(hash));
    }

    private static string VorbereitungP(WegwerfRepo repo)
    {
        repo.SchreibeDatei("README.md", "Zeile 1\nZeile 2\n");
        repo.SchreibeDatei("src/a.txt", "a\nb\nc\n");
        repo.SchreibeDatei("src/b.txt", "x\ny\n");
        repo.SchreibeDatei("alt.txt", "1\n2\n3\n4\n");
        return repo.Committe("Start", "Anna Beispiel", "2026-03-04T09:15:00+01:00", "");
    }
}
