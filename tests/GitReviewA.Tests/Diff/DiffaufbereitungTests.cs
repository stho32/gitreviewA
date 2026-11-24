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

    [TestCase("unspecified", Diffaufbereitung.GrundNullbytes)]
    [TestCase("set", Diffaufbereitung.GrundNullbytes)]
    [TestCase("unset", Diffaufbereitung.GrundAttribut)]
    [TestCase("verbergen", Diffaufbereitung.GrundAttribut)]
    public void Wenn_Binaerdatei_dann_Grund_aus_dem_diff_Attribut(string attribut, string grund)
    {
        Assert.That(Diffaufbereitung.BinaerGrundAus(attribut), Is.EqualTo(grund));
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

    [Test]
    [Description("R00015 B1406, Kriterium 4: netto ein Patch gegen den Elternstand, mit den Commits der Kette")]
    public void Wenn_der_Netto_Patch_aufbereitet_wird_dann_netto_mit_den_Commits_und_vier_hinzugefuegten_Zeilen()
    {
        var ausgabe = "diff --git a/src/a.txt b/src/a.txt\nnew file mode 100644\n--- /dev/null\n+++ b/src/a.txt\n@@ -0,0 +1,4 @@\n+eins\n+ZWEI\n+drei\n+vier\n";

        var antwort = Diffaufbereitung.Netto(new Dateiaenderung("A", "src/a.txt", null, 4, 0), ausgabe, null, ["z1", "z2", "z3"]);

        Assert.That((antwort.Netto, antwort.Commits, antwort.Art, antwort.Grund), Is.EqualTo((true, new[] { "z1", "z2", "z3" }, Diffaufbereitung.ArtText, (string?)null)));
        Assert.That(antwort.Patch!.Split('\n').Where(zeile => zeile.StartsWith('+')).Select(zeile => zeile[1..]), Is.EqualTo(new[] { "eins", "ZWEI", "drei", "vier" }));
        Assert.That(antwort.Patch, Does.Not.Contain("zwei").And.Not.Contain("diff --git"), "die Zeile zwei aus z1 kommt nicht vor, der Kopf liegt nicht im Patch");
        Assert.That(antwort.Abschnitte, Is.Empty);
    }

    [Test]
    [Description("R00015 B1406, Kriterium 6: eine Binärdatei kommt mit Grund und ohne Byte-Inhalt")]
    public void Wenn_der_Netto_Patch_binaer_ist_dann_Art_binaer_mit_Grund_ohne_Inhalt()
    {
        var antwort = Diffaufbereitung.Netto(new Dateiaenderung("A", "logo.bin", null, null, null), "", Diffaufbereitung.GrundNullbytes, ["z1"]);

        Assert.That((antwort.Art, antwort.Grund, antwort.Patch), Is.EqualTo((Diffaufbereitung.ArtBinaer, Diffaufbereitung.GrundNullbytes, (string?)null)));
    }

    [Test]
    [Description("R00015 B1406, Kriterium 5: ohne Kette Abschnitte je Commit in Aufrufreihenfolge, jeder mit seinem Commit")]
    public void Wenn_ohne_Kette_aufbereitet_wird_dann_Abschnitte_je_Commit()
    {
        var abschnitte = new[]
        {
            new Diffabschnitt("z1", Diffaufbereitung.ArtText, null, "@@ -0,0 +1,3 @@\n+eins\n+zwei\n+drei\n"),
            new Diffabschnitt("z3", Diffaufbereitung.ArtText, null, "@@ -1,3 +1,4 @@\n eins\n drei\n+vier\n"),
        };

        var antwort = Diffaufbereitung.Abschnitte(new Dateiaenderung("M", "src/a.txt", null, 4, 0), abschnitte);

        Assert.That((antwort.Netto, antwort.Art, antwort.Patch, antwort.Commits), Is.EqualTo((false, Diffaufbereitung.ArtText, (string?)null, Array.Empty<string>())));
        Assert.That(antwort.Abschnitte.Select(teil => teil.Commit), Is.EqualTo(new[] { "z1", "z3" }));
        Assert.That(antwort.Abschnitte[0].Patch.Split('\n').Count(zeile => zeile.StartsWith('+')), Is.EqualTo(3));
        Assert.That(antwort.Abschnitte[1].Patch.Split('\n').Count(zeile => zeile.StartsWith('+')), Is.EqualTo(1));
    }

    [Test]
    [Description("R00015 B1406: eine einzelne Binärstelle macht den Satz binär und trägt den Grund")]
    public void Wenn_ein_Abschnitt_binaer_ist_dann_Art_binaer_mit_seinem_Grund()
    {
        var antwort = Diffaufbereitung.Abschnitte(
            new Dateiaenderung("A", "logo.bin", null, null, null),
            [new Diffabschnitt("z1", Diffaufbereitung.ArtBinaer, Diffaufbereitung.GrundNullbytes, "")]);

        Assert.That((antwort.Art, antwort.Grund), Is.EqualTo((Diffaufbereitung.ArtBinaer, Diffaufbereitung.GrundNullbytes)));
    }
}
