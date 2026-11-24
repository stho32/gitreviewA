using System.Diagnostics;

namespace GitReviewA.Tests.Hilfen;

internal sealed class WegwerfRepo : IDisposable
{
    private static readonly DateTimeOffset ErsterZeitpunkt = new(2026, 1, 1, 9, 0, 0, TimeSpan.Zero);

    private readonly bool alleZurSelbenZeit;

    private WegwerfRepo(string ordner, bool alleZurSelbenZeit = false)
    {
        Ordner = ordner;
        this.alleZurSelbenZeit = alleZurSelbenZeit;
    }

    public string Ordner { get; }

    public IReadOnlyList<string> Hashes { get; private set; } = [];

    private int weitereCommits;

    public static WegwerfRepo MitCommits(params string[] betreffe)
    {
        return MitCommits(alleZurSelbenZeit: false, betreffe);
    }

    /// <summary>Wie <see cref="MitCommits(string[])"/>, aber alle Commits — auch spätere — tragen dieselbe Zeit, wie Commits einer KI in derselben Sekunde.</summary>
    public static WegwerfRepo MitCommitsZurSelbenZeit(params string[] betreffe)
    {
        return MitCommits(alleZurSelbenZeit: true, betreffe);
    }

    private static WegwerfRepo MitCommits(bool alleZurSelbenZeit, string[] betreffe)
    {
        var ordner = Directory.CreateTempSubdirectory("gitreviewa-test-").FullName;
        var repo = new WegwerfRepo(ordner, alleZurSelbenZeit);
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

    /// <summary>Committet den Stand des Arbeitsordners (auch leer) mit eigenem Autor, Autordatum und Rumpf.</summary>
    public string Committe(string betreff, string autor, string datum, string rumpf)
    {
        Git("add", "-A");
        var angaben = new Dictionary<string, string> { ["GIT_AUTHOR_NAME"] = autor, ["GIT_AUTHOR_DATE"] = datum, ["GIT_COMMITTER_DATE"] = datum };
        var nachricht = new List<string> { "commit", "-q", "--allow-empty", "-m", betreff };
        var hatRumpf = rumpf.Length > 0;
        if (hatRumpf)
        {
            nachricht.AddRange(["-m", rumpf]);
        }
        Ausfuehren(nachricht.ToArray(), angaben);
        return Git("rev-parse", "HEAD");
    }

    public void SchreibeDatei(string pfad, string inhalt)
    {
        var ziel = new FileInfo(Path.Combine(Ordner, pfad));
        ziel.Directory?.Create();
        File.WriteAllText(ziel.FullName, inhalt);
    }

    /// <summary>Ein Basis-Commit und darüber <paramref name="anzahl"/> leere Commits, per <c>git fast-import</c>; Zeiten eine Minute auseinander.</summary>
    public static WegwerfRepo MitVielenCommits(int anzahl)
    {
        var ordner = Directory.CreateTempSubdirectory("gitreviewa-test-").FullName;
        var repo = new WegwerfRepo(ordner);
        try
        {
            repo.Git("init", "-q", "-b", "main");
            var befehle = new System.Text.StringBuilder();
            for (var nummer = 0; nummer <= anzahl; nummer++)
            {
                var betreff = $"Commit Nummer {nummer}";
                var sekunde = ErsterZeitpunkt.AddMinutes(nummer).ToUnixTimeSeconds();
                befehle.Append($"commit refs/heads/main\ncommitter Testperson <test@example.invalid> {sekunde} +0000\ndata {betreff.Length}\n{betreff}\n\n");
            }
            repo.Ausfuehren(["fast-import", "--quiet"], new Dictionary<string, string>(), befehle.ToString());
            repo.Hashes = repo.Git("rev-list", "--reverse", "HEAD").Split('\n');
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

    /// <summary>Leerer Commit auf dem ausgecheckten Zweig, eine Minute nach dem vorigen; liefert seinen Hash.</summary>
    public string LeererCommit(string betreff)
    {
        weitereCommits++;
        var zeitpunkt = Zeitpunkt(Hashes.Count + weitereCommits);
        var eigeneZeit = new Dictionary<string, string> { ["GIT_AUTHOR_DATE"] = zeitpunkt, ["GIT_COMMITTER_DATE"] = zeitpunkt };
        Ausfuehren(["commit", "-q", "--allow-empty", "-m", betreff], eigeneZeit);
        return Git("rev-parse", "HEAD");
    }

    /// <summary>Merge ohne Vorspulen, eine Minute nach dem vorigen Commit; liefert den Hash des Merges.</summary>
    public string Merge(string zweig, string betreff)
    {
        weitereCommits++;
        var zeitpunkt = Zeitpunkt(Hashes.Count + weitereCommits);
        var eigeneZeit = new Dictionary<string, string> { ["GIT_AUTHOR_DATE"] = zeitpunkt, ["GIT_COMMITTER_DATE"] = zeitpunkt };
        Ausfuehren(["merge", "-q", "--no-ff", "-m", betreff, zweig], eigeneZeit);
        return Git("rev-parse", "HEAD");
    }

    public void Dispose()
    {
        Directory.Delete(Ordner, recursive: true);
    }

    private string Committe(string betreff, int index)
    {
        File.WriteAllText(Path.Combine(Ordner, "datei.txt"), $"Stand {index}\n");
        Git("add", "datei.txt");
        var zeitpunkt = Zeitpunkt(index);
        var eigeneZeit = new Dictionary<string, string> { ["GIT_AUTHOR_DATE"] = zeitpunkt, ["GIT_COMMITTER_DATE"] = zeitpunkt };
        Ausfuehren(["commit", "-q", "-m", betreff], eigeneZeit);
        return Git("rev-parse", "HEAD");
    }

    private string Zeitpunkt(int minute)
    {
        var zeitpunkt = ErsterZeitpunkt;
        if (!alleZurSelbenZeit)
        {
            zeitpunkt = ErsterZeitpunkt.AddMinutes(minute);
        }
        return zeitpunkt.ToString("yyyy-MM-ddTHH:mm:sszzz", System.Globalization.CultureInfo.InvariantCulture);
    }

    private string Ausfuehren(string[] argumente, Dictionary<string, string> zusatzumgebung, string? eingabe = null)
    {
        var start = new ProcessStartInfo("git")
        {
            WorkingDirectory = Ordner,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            RedirectStandardInput = eingabe is not null,
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
        if (eingabe is not null)
        {
            prozess.StandardInput.Write(eingabe);
            prozess.StandardInput.Close();
        }
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
