using GitReviewA.Diff;

namespace GitReviewA.Tests.Diff;

public class PatcheinheitTests
{
    [TestCase("")]
    [TestCase("@@ -1 +1,2 @@\n alt\n+neu\n")]
    [TestCase("@@ -1 +1,2 @@\n alt\n+diff --git a/x b/x\n")]
    [TestCase("@@ -1,2 +1 @@\n alt\n-diff --git a/x b/x\n")]
    [TestCase("@@ -1 +1,2 @@\n diff --git a/x b/x\n+neu\n")]
    public void Wenn_jede_Zeile_nach_dem_ersten_Abschnitt_zum_Abschnitt_gehoert_dann_eine_Datei(string patch)
    {
        var eineDatei = Patcheinheit.ZeigtEineDatei(patch);

        Assert.That(eineDatei, Is.True);
    }

    [TestCase("@@ -1 +1 @@\n alt\ndiff --git a/in.txt b/in.txt\n@@ -1 +1,2 @@\n x\n+y\n")]
    [TestCase("@@ -1 +1 @@\n alt\ndiff --git a/h\n")]
    [TestCase("diff --git a/h b/h\n")]
    public void Wenn_eine_Zeile_mit_diff_git_einen_zweiten_Dateikopf_beginnt_dann_nicht_eine_Datei(string patch)
    {
        var eineDatei = Patcheinheit.ZeigtEineDatei(patch);

        Assert.That(eineDatei, Is.False);
    }
}
