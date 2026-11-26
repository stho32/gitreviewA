using System.Diagnostics;
using System.Text;
using GitReviewA.Aufruf;
using GitReviewA.Dateiansicht;
using GitReviewA.Git;
using GitReviewA.Protokoll;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Dateiansicht;

/// <summary>
/// Die Angriffsmatrix der Dateiansicht (R00043) auf der Ebene Prozess und Interactor: ungebbarer Name (L1/N5), Terminal- und
/// Log-Fälschung (N3/N4), kein git-Aufruf bei Datenträger-Angaben (P13), Browser-Öffner nur mit Adresse (X9), stdout in jedem
/// Ausgang 0 Bytes (X1), kein Dateiinhalt auf stderr (X2), wörtliche Angaben (P15), stdin wird nie gelesen (P12),
/// Größe lügt (G2) und die Summe bricht ab.
/// </summary>
[NonParallelizable]
public class DateiansichtMatrixTests
{
    [Test]
    public async Task Wenn_die_Angabe_ein_rohes_ungueltiges_Byte_hat_dann_Exit_2_und_nie_der_Inhalt_der_Ersatzdatei()
    {
        using var d = OrdnerD.Anlegen();
        var skript = Path.Combine(d.Ordner, "starte-mit-rohbyte.py");
        await File.WriteAllTextAsync(skript, """
            import os, sys
            dll, dotnet = sys.argv[1], sys.argv[2]
            open(b'f\xff.sql', 'wb').write(b'INHALT-RAW\n')
            open(b'f\xef\xbf\xbd.sql', 'wb').write(b'INHALT-FFFD\n')
            os.execve(dotnet.encode(), [dotnet.encode(), dll.encode(), b'--dateien', b'f\xff.sql', b'--kein-browser'], os.environ)
            """);
        var start = new ProcessStartInfo("python3")
        {
            WorkingDirectory = d.Ordner,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
        };
        start.ArgumentList.Add(skript);
        start.ArgumentList.Add(typeof(Aufrufleser).Assembly.Location);
        start.ArgumentList.Add(DotnetPfad());
        using var prozess = Process.Start(start) ?? throw new InvalidOperationException("Python startet nicht");
        var ausgabe = await prozess.StandardOutput.ReadToEndAsync();
        var fehler = await prozess.StandardError.ReadToEndAsync();
        await prozess.WaitForExitAsync();
        EntferneRohbyteDatei(d.Ordner);

        Assert.That(prozess.ExitCode, Is.EqualTo(2));
        Assert.That(ausgabe, Is.Empty);
        Assert.That(fehler, Does.Contain("Name nicht übergebbar (ungültiges Byte oder Ersatzzeichen U+FFFD)"));
        Assert.That(fehler, Does.Not.Contain("INHALT-RAW"));
        Assert.That(fehler, Does.Not.Contain("INHALT-FFFD"));
        Assert.That(fehler, Does.Not.Contain("http://127.0.0.1"));
    }

    [Test]
    public async Task Wenn_der_Name_Steuerzeichen_und_eine_falsche_Startzeile_traegt_dann_bleibt_es_eine_Zeile_mit_Marken()
    {
        using var d = OrdnerD.Anlegen();
        var angabe = "x\u001b[2J\u0007\u007f\n2026-11-25T00:00:00.000+01:00 INFO [Start] gitreviewA läuft auf http://127.0.0.1:1/.sql";
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", angabe, "--kein-browser");

        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(2));
        Assert.That(lauf.Fehler, Does.Contain("⟨U+001B⟩"));
        Assert.That(lauf.Fehler, Does.Contain("⟨U+0007⟩"));
        Assert.That(lauf.Fehler, Does.Contain("⟨U+007F⟩"));
        Assert.That(lauf.Fehler, Does.Contain("⟨U+000A⟩"));
        Assert.That(lauf.Fehler.Contains('\u001b'), Is.False);
        Assert.That(lauf.Fehler.Contains('\u0007'), Is.False);
        Assert.That(lauf.Fehler.Contains('\u007f'), Is.False);
        var zeilen = lauf.Fehler.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        Assert.That(zeilen, Has.Length.EqualTo(1));
        Assert.That(zeilen.Any(zeile => zeile.StartsWith("2026-11-25T00:00:00", StringComparison.Ordinal)), Is.False);
    }

    [Test]
    public async Task Wenn_eine_Datei_vom_Datentraeger_gezeigt_wird_dann_startet_kein_git_auch_bei_fremder_Config()
    {
        using var d = OrdnerD.Anlegen();
        var marker = Path.Combine(d.Ordner, "git-aufgerufen.txt");
        var markerVerzeichnis = Path.Combine(d.Ordner, "marker-bin");
        Directory.CreateDirectory(markerVerzeichnis);
        var gitSkript = Path.Combine(markerVerzeichnis, "git");
        await File.WriteAllTextAsync(gitSkript, $"#!/bin/sh\necho \"$@\" >> '{marker}'\nexec /usr/bin/git \"$@\"\n");
        if (OperatingSystem.IsLinux() || OperatingSystem.IsMacOS())
        {
            File.SetUnixFileMode(gitSkript, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        }
        Directory.CreateDirectory(Path.Combine(d.Ordner, ".git"));
        await File.WriteAllTextAsync(Path.Combine(d.Ordner, ".git", "config"), $"[core]\n\tfsmonitor = {Path.Combine(markerVerzeichnis, "git")}\n");
        var pfadVorher = Environment.GetEnvironmentVariable("PATH") ?? string.Empty;
        using var lauf = await Dateiansichtprozess.StarteMitUmgebungAsync(
            d.Ordner,
            ["--dateien", "a.sql", "--kein-browser", "--port", "0"],
            new Dictionary<string, string> { ["PATH"] = $"{markerVerzeichnis}:{pfadVorher}" },
            stdinOffen: false);
        Assert.That(lauf.Adresse, Is.Not.Null);

        await lauf.AbrufenAsync("api/dateiansicht/0");
        await lauf.SchliessenAsync();
        await lauf.WarteAufEndeAsync();

        Assert.That(File.Exists(marker), Is.False);
    }

    [Test]
    public async Task Wenn_der_Browser_geoeffnet_wird_dann_erhaelt_er_genau_die_Adresse_und_sein_stdout_bleibt_aus_dem_Ergebnis()
    {
        using var d = OrdnerD.Anlegen();
        var browserDatei = Path.Combine(d.Ordner, "browser-argumente.txt");
        var browserSkript = Path.Combine(d.Ordner, "browser.sh");
        await File.WriteAllTextAsync(browserSkript, $"#!/bin/sh\nprintf '%s' \"$1\" > '{browserDatei}'\necho 'BROWSER-STDOUT'\n");
        if (OperatingSystem.IsLinux() || OperatingSystem.IsMacOS())
        {
            File.SetUnixFileMode(browserSkript, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        }
        using var lauf = await Dateiansichtprozess.StarteMitUmgebungAsync(
            d.Ordner,
            ["--dateien", "a.sql", "--port", "0", "--verbose"],
            new Dictionary<string, string> { ["GITREVIEWA_BROWSER"] = browserSkript },
            stdinOffen: false);
        Assert.That(lauf.Adresse, Is.Not.Null);
        await WarteAufDatei(browserDatei);

        await lauf.SchliessenAsync();
        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(0));
        Assert.That(lauf.Ausgabe, Is.Empty);
        var argument = await File.ReadAllTextAsync(browserDatei);
        Assert.That(argument, Is.EqualTo(lauf.Adresse));
        Assert.That(argument, Does.Not.Contain("a.sql"));
    }

    [Test]
    public async Task Wenn_ein_Inhalt_einen_Marker_traegt_dann_erscheint_er_nie_auf_stderr()
    {
        using var d = OrdnerD.Anlegen();
        await File.WriteAllTextAsync(d.Pfad("geheim.sql"), "GEHEIM-7f3a\n");
        await File.WriteAllBytesAsync(d.Pfad("geheim-latin1.sql"), [.. "GEHEIM-7f3a 'caf"u8.ToArray(), 0xE9]);
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", "geheim.sql", "--kein-browser", "--port", "0", "--verbose");
        await lauf.AbrufenAsync("api/dateiansicht/0");
        await lauf.SchliessenAsync();
        await lauf.WarteAufEndeAsync();
        using var fehler = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", "geheim-latin1.sql", "--kein-browser", "--verbose");
        await fehler.WarteAufEndeAsync();

        Assert.That(lauf.Fehler, Does.Not.Contain("GEHEIM-7f3a"));
        Assert.That(fehler.Fehler, Does.Not.Contain("GEHEIM-7f3a"));
    }

    [Test]
    public async Task Wenn_stdin_eine_offene_Roehre_ist_dann_startet_die_Dateiansicht_trotzdem()
    {
        using var d = OrdnerD.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteMitUmgebungAsync(
            d.Ordner,
            ["--dateien", "a.sql", "--kein-browser", "--port", "0"],
            umgebung: null,
            stdinOffen: true);

        Assert.That(lauf.Adresse, Is.Not.Null);
        await lauf.SchliessenAsync();
        Assert.That(await lauf.WarteAufEndeAsync(), Is.EqualTo(0));
    }

    [TestCase("*.sql")]
    [TestCase("$HOME/a.sql")]
    [TestCase("~/a.sql")]
    [TestCase("[a].sql")]
    [TestCase("a.sql ")]
    public void Wenn_die_Angabe_wie_ein_Muster_aussieht_dann_wird_sie_woertlich_genommen(string angabe)
    {
        using var d = OrdnerD.Anlegen();
        var ziel = Path.Combine(d.Ordner, angabe);
        Directory.CreateDirectory(Path.GetDirectoryName(ziel) ?? d.Ordner);
        File.WriteAllText(ziel, "SELECT 1;\n");
        var vorher = Directory.GetCurrentDirectory();
        Directory.SetCurrentDirectory(d.Ordner);
        try
        {
            var ausgang = new DateiansichtStartInteractor(new DateiLeser(new Quellenbuchung()), new GitCommitDateiquelle(Directory.GetCurrentDirectory(), new Quellenbuchung()))
                .Starte(new Dateiaufruf([angabe], 0, BrowserOeffnen: false, Protokollstufe.Warnung));

            Assert.That(ausgang.IstErfolg, Is.True);
            Assert.That(ausgang.Stand?[0].Anzeigename, Is.EqualTo(angabe));
        }
        finally
        {
            Directory.SetCurrentDirectory(vorher);
        }
    }

    [Test]
    public void Wenn_die_Datei_groesser_ist_als_ihre_Groesse_behauptet_dann_zu_gross_in_unter_zwei_Sekunden()
    {
        using var d = OrdnerD.Anlegen();
        var sparse = d.Pfad("sparse.sql");
        using (var strom = new FileStream(sparse, FileMode.Create, FileAccess.Write))
        {
            strom.SetLength(100L * 1024 * 1024 * 1024);
        }
        var uhr = Stopwatch.StartNew();

        var ausgang = new DateiansichtStartInteractor(new DateiLeser(new Quellenbuchung()), new GitCommitDateiquelle(Directory.GetCurrentDirectory(), new Quellenbuchung()))
            .Starte(new Dateiaufruf([sparse], 0, BrowserOeffnen: false, Protokollstufe.Warnung));

        uhr.Stop();
        Assert.That(ausgang.Fehler[0].Grund.Art, Is.EqualTo(Quellengrundart.ZuGross));
        Assert.That(uhr.ElapsedMilliseconds, Is.LessThan(2000));
    }

    private static void EntferneRohbyteDatei(string ordner)
    {
        using var python = Process.Start("python3", ["-c", $"import os; os.unlink(b'{ordner}/f\\xff.sql')"]);
        python?.WaitForExit();
    }

    private static async Task WarteAufDatei(string pfad)
    {
        var frist = Stopwatch.StartNew();
        while (!File.Exists(pfad) && frist.Elapsed < TimeSpan.FromSeconds(10))
        {
            await Task.Delay(20);
        }
        Assert.That(File.Exists(pfad), Is.True, "Browser-Öffner wurde nicht aufgerufen");
    }

    private static string DotnetPfad()
    {
        using var which = Process.Start(new ProcessStartInfo("which", "dotnet") { RedirectStandardOutput = true });
        var pfad = which?.StandardOutput.ReadToEnd().Trim() ?? "dotnet";
        which?.WaitForExit();
        return pfad;
    }
}