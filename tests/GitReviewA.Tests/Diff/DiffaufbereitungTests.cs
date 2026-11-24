using GitReviewA.Diff;
using GitReviewA.Git;

namespace GitReviewA.Tests.Diff;

public class DiffaufbereitungTests
{
    [Test]
    public void Wenn_git_Zeilen_zaehlt_dann_Art_text()
    {
        var art = Diffaufbereitung.ArtVon(new Dateiaenderung("M", "src/b.txt", null, 2, 1));

        Assert.That(art, Is.EqualTo(Diffaufbereitung.ArtText));
    }

    [Test]
    public void Wenn_git_keine_Zeilen_zaehlt_dann_Art_binaer()
    {
        var art = Diffaufbereitung.ArtVon(new Dateiaenderung("A", "logo.bin", null, null, null));

        Assert.That(art, Is.EqualTo(Diffaufbereitung.ArtBinaer));
    }

    [TestCase("R", "LIESMICH.md", "README.md")]
    [TestCase("A", "leer.txt", null)]
    [TestCase("M", "skript.sh", null)]
    public void Wenn_null_Zeilen_hinzugefuegt_und_entfernt_dann_Art_leer(string status, string pfad, string? alterPfad)
    {
        var art = Diffaufbereitung.ArtVon(new Dateiaenderung(status, pfad, alterPfad, 0, 0));

        Assert.That(art, Is.EqualTo(Diffaufbereitung.ArtLeer));
    }

    [Test]
    public void Wenn_Ausgabe_mit_Dateikopf_dann_Patch_ab_dem_ersten_Hunk_Kopf()
    {
        var ausgabe = "diff --git a/src/b.txt b/src/b.txt\nindex 1..2 100644\n--- a/src/b.txt\n+++ b/src/b.txt\n@@ -1,2 +1,3 @@\n eins\n-zwei\n+ZWEI\n+drei\n";

        var patch = Diffaufbereitung.PatchAbErstemHunk(ausgabe);

        Assert.That(patch, Is.EqualTo("@@ -1,2 +1,3 @@\n eins\n-zwei\n+ZWEI\n+drei\n"));
    }

    [Test]
    public void Wenn_Inhalt_wie_ein_Kopf_aussieht_dann_zaehlt_nur_der_erste_Hunk_Kopf_am_Zeilenanfang()
    {
        var ausgabe = "diff --git a/x b/x\nnew file mode 100644\n--- /dev/null\n+++ b/x\n@@ -0,0 +1,2 @@ titel\n+@@ -9 +9 @@\n+diff --git a/y b/y\n";

        var patch = Diffaufbereitung.PatchAbErstemHunk(ausgabe);

        Assert.That(patch, Is.EqualTo("@@ -0,0 +1,2 @@ titel\n+@@ -9 +9 @@\n+diff --git a/y b/y\n"));
    }

    [TestCase("")]
    [TestCase("diff --git a/README.md b/LIESMICH.md\nsimilarity index 100%\nrename from README.md\nrename to LIESMICH.md\n")]
    public void Wenn_Ausgabe_ohne_Hunk_dann_leerer_Patch(string ausgabe)
    {
        var patch = Diffaufbereitung.PatchAbErstemHunk(ausgabe);

        Assert.That(patch, Is.Empty);
    }
}
