using GitReviewA.Aufruf;
using GitReviewA.Git;

namespace GitReviewA.Tests.Git;

[NonParallelizable]
public class GitLeserOhneGitTests
{
    [Test]
    public void Wenn_git_nicht_im_Suchpfad_dann_GitFehler_mit_Hinweis_auf_git()
    {
        var leererOrdner = Directory.CreateTempSubdirectory("gitreviewa-ohne-git-").FullName;
        var alterSuchpfad = Environment.GetEnvironmentVariable("PATH");
        try
        {
            Environment.SetEnvironmentVariable("PATH", leererOrdner);

            var fehler = Assert.Throws<GitFehler>(() => GitLeser.Lesen(new CommitHashes(["deadbeef"]), leererOrdner));

            Assert.That(fehler.Message, Does.StartWith("git ließ sich nicht starten"));
        }
        finally
        {
            Environment.SetEnvironmentVariable("PATH", alterSuchpfad);
            Directory.Delete(leererOrdner, recursive: true);
        }
    }
}
