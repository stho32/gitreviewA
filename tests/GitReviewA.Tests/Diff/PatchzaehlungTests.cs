using GitReviewA.Diff;
using GitReviewA.Git;

namespace GitReviewA.Tests.Diff;

public class PatchzaehlungTests
{
    [Test]
    public void Wenn_g_txt_plus_1_minus_0_und_der_Patch_eine_Plus_Zeile_traegt_dann_passt_er()
    {
        var passt = Patchzaehlung.PasstZurDateiliste("@@ -1 +1,2 @@\n alt\n+neu\n", Datei(1, 0));

        Assert.That(passt, Is.True);
    }

    [Test]
    public void Wenn_der_Patch_leer_ist_aber_plus_1_gezaehlt_dann_passt_er_nicht()
    {
        var passt = Patchzaehlung.PasstZurDateiliste("", Datei(1, 0));

        Assert.That(passt, Is.False);
    }

    [Test]
    public void Wenn_umbenannt_plus_1_minus_1_dann_passt_der_Patch_mit_einer_Minus_und_einer_Plus_Zeile()
    {
        var passt = Patchzaehlung.PasstZurDateiliste("@@ -5,4 +5,4 @@ zeile4\n zeile5\n zeile6\n zeile7\n-zeile8\n+GEAENDERT\n", Datei(1, 1));

        Assert.That(passt, Is.True);
    }

    [Test]
    public void Wenn_eine_Zeile_mit_plus_beginnt_dann_zaehlt_sie_als_eine_Plus_Zeile()
    {
        var passt = Patchzaehlung.PasstZurDateiliste("@@ -0,0 +1,2 @@\n++x\n+--y\n", Datei(2, 0));

        Assert.That(passt, Is.True);
    }

    [Test]
    public void Wenn_mehrere_Abschnitte_und_ohne_Zeilenende_dann_zaehlen_alle_Abschnitte_und_der_Hinweis_nicht()
    {
        var patch = "@@ -1 +1 @@\n-a\n+A\n@@ -9 +9 @@\n-b\n\\ No newline at end of file\n+B\n\\ No newline at end of file\n";

        Assert.That(Patchzaehlung.PasstZurDateiliste(patch, Datei(2, 2)), Is.True);
        Assert.That(Patchzaehlung.PasstZurDateiliste(patch, Datei(3, 2)), Is.False);
        Assert.That(Patchzaehlung.PasstZurDateiliste(patch, Datei(2, 1)), Is.False);
    }

    [Test]
    public void Wenn_der_Patch_mehr_Zeilen_traegt_als_gezaehlt_dann_passt_er_nicht()
    {
        var passt = Patchzaehlung.PasstZurDateiliste("@@ -0,0 +1,2 @@\n+literal\n+echt\n", Datei(1, 0));

        Assert.That(passt, Is.False);
    }

    private static Dateiaenderung Datei(int plus, int minus)
    {
        return new Dateiaenderung("M", "g.txt", null, plus, minus);
    }
}
