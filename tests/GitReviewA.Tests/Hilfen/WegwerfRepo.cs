using System.Diagnostics;

namespace GitReviewA.Tests.Hilfen;

internal sealed class WegwerfRepo : IDisposable
{
    private WegwerfRepo(string ordner)
    {
        Ordner = ordner;
    }

    public string Ordner { get; }

    public IReadOnlyList<string> Hashes { get; private set; } = [];

    public static WegwerfRepo MitCommits(params string[] betreffe)
    {
        var ordner = Directory.CreateTempSubdirectory("gitreviewa-test-").FullName;
        var repo = new WegwerfRepo(ordner);
        repo.Git("init", "-q", "-b", "main");
        repo.Hashes = betreffe.Select((betreff, index) => repo.Committe(betreff, index)).ToList();
        return repo;
    }

    public string Git(params string[] argumente)
    {
        var start = new ProcessStartInfo("git")
        {
            WorkingDirectory = Ordner,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        };
        foreach (var argument in argumente)
        {
            start.ArgumentList.Add(argument);
        }
        SetzeUnabhaengigeGitUmgebung(start);
        using var prozess = Process.Start(start)!;
        var ausgabe = prozess.StandardOutput.ReadToEnd();
        var fehler = prozess.StandardError.ReadToEnd();
        prozess.WaitForExit();
        var gitIstGescheitert = prozess.ExitCode != 0;
        if (gitIstGescheitert)
        {
            throw new InvalidOperationException($"git {string.Join(' ', argumente)} endete mit {prozess.ExitCode}: {fehler}");
        }
        return ausgabe.TrimEnd('\n');
    }

    public void Dispose()
    {
        Directory.Delete(Ordner, recursive: true);
    }

    private string Committe(string betreff, int index)
    {
        File.WriteAllText(Path.Combine(Ordner, "datei.txt"), $"Stand {index}\n");
        Git("add", "datei.txt");
        Git("commit", "-q", "-m", betreff);
        return Git("rev-parse", "HEAD");
    }

    private static void SetzeUnabhaengigeGitUmgebung(ProcessStartInfo start)
    {
        start.Environment["GIT_CONFIG_NOSYSTEM"] = "1";
        start.Environment["GIT_CONFIG_GLOBAL"] = "/dev/null";
        start.Environment["GIT_AUTHOR_NAME"] = "Testperson";
        start.Environment["GIT_AUTHOR_EMAIL"] = "test@example.invalid";
        start.Environment["GIT_COMMITTER_NAME"] = "Testperson";
        start.Environment["GIT_COMMITTER_EMAIL"] = "test@example.invalid";
    }
}
