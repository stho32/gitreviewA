using System.Diagnostics;

namespace GitReviewA.Tests.Hilfen;

internal sealed class WegwerfRepo : IDisposable
{
    private static readonly DateTimeOffset ErsterZeitpunkt = new(2026, 1, 1, 9, 0, 0, TimeSpan.Zero);

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
        try
        {
            repo.Git("init", "-q", "-b", "main");
            repo.Hashes = betreffe.Select((betreff, index) => repo.Committe(betreff, index)).ToList();
            return repo;
        }
        catch
        {
            repo.Dispose();
            throw;
        }
    }

    public string Git(params string[] argumente)
    {
        return Ausfuehren(argumente, new Dictionary<string, string>());
    }

    public void Dispose()
    {
        Directory.Delete(Ordner, recursive: true);
    }

    private string Committe(string betreff, int index)
    {
        File.WriteAllText(Path.Combine(Ordner, "datei.txt"), $"Stand {index}\n");
        Git("add", "datei.txt");
        var zeitpunkt = ErsterZeitpunkt.AddMinutes(index).ToString("yyyy-MM-ddTHH:mm:sszzz", System.Globalization.CultureInfo.InvariantCulture);
        var eigeneZeit = new Dictionary<string, string> { ["GIT_AUTHOR_DATE"] = zeitpunkt, ["GIT_COMMITTER_DATE"] = zeitpunkt };
        Ausfuehren(["commit", "-q", "-m", betreff], eigeneZeit);
        return Git("rev-parse", "HEAD");
    }

    private string Ausfuehren(string[] argumente, Dictionary<string, string> zusatzumgebung)
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
        foreach (var (name, wert) in zusatzumgebung)
        {
            start.Environment[name] = wert;
        }
        using var prozess = Process.Start(start)!;
        var fehler = new System.Text.StringBuilder();
        prozess.ErrorDataReceived += (_, zeile) => fehler.AppendLine(zeile.Data);
        prozess.BeginErrorReadLine();
        var ausgabe = prozess.StandardOutput.ReadToEnd();
        prozess.WaitForExit();
        var gitIstGescheitert = prozess.ExitCode != 0;
        if (gitIstGescheitert)
        {
            throw new InvalidOperationException($"git {string.Join(' ', argumente)} endete mit {prozess.ExitCode}: {fehler}");
        }
        return ausgabe.TrimEnd('\n');
    }

    // git commit startet sonst `git maintenance run --auto --detach`; der losgelöste Prozess erbt die Ausgabe-Pipes
    // und hält ReadToEnd offen, bis er endet.
    private static void SetzeUnabhaengigeGitUmgebung(ProcessStartInfo start)
    {
        start.Environment["GIT_CONFIG_NOSYSTEM"] = "1";
        start.Environment["GIT_CONFIG_GLOBAL"] = "/dev/null";
        start.Environment["GIT_AUTHOR_NAME"] = "Testperson";
        start.Environment["GIT_AUTHOR_EMAIL"] = "test@example.invalid";
        start.Environment["GIT_COMMITTER_NAME"] = "Testperson";
        start.Environment["GIT_COMMITTER_EMAIL"] = "test@example.invalid";
        start.Environment["GIT_CONFIG_COUNT"] = "2";
        start.Environment["GIT_CONFIG_KEY_0"] = "maintenance.auto";
        start.Environment["GIT_CONFIG_VALUE_0"] = "false";
        start.Environment["GIT_CONFIG_KEY_1"] = "gc.auto";
        start.Environment["GIT_CONFIG_VALUE_1"] = "0";
    }
}
