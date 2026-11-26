using System.Diagnostics;
using System.Text.Json;
using GitReviewA.Aufruf;
using GitReviewA.Dateiansicht;
using GitReviewA.Protokoll;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Dateiansicht;

/// <summary>
/// Die Angriffsmatrix von `<commit>:<pfad>` (R00046) auf der Ebene Prozess: die Tabelle der Gründe (Kriterium 2) mit Exit 2,
/// leerem stdout und genau einer `FEHLER [Dateiansicht]`-Zeile je Angabe; die Marker-Probe je git-Aufruf (Kriterium 3);
/// `refs/replace`; kein Repository (R00016); rohes Byte im Pfad (Kriterium 7, N6); und die gemeinsame Summe über Datenträger
/// und Commit (Kriterium 10, G5).
/// </summary>
[NonParallelizable]
public class DateiansichtCommitMatrixTests
{
    [TestCase("sql/fehlt.sql", "Pfad im Commit nicht gefunden")]
    [TestCase("sql/alt", "ist im Commit ein Verzeichnis")]
    [TestCase("sql/alt/", "ist im Commit ein Verzeichnis")]
    [TestCase("link.sql", "ist im Commit ein symbolischer Link")]
    [TestCase("sub", "ist im Commit ein Submodul")]
    [TestCase("sql/gross.bin", "Binärdatei — enthält Null-Bytes")]
    [TestCase("sql/a.sql/", "Pfad im Commit nicht gefunden")]
    [TestCase("sql/./a.sql", "Pfad im Commit nicht gefunden")]
    [TestCase("(top)sql/a.sql", "Pfad im Commit nicht gefunden")]
    [TestCase("*.sql", "Pfad im Commit nicht gefunden")]
    public async Task Wenn_eine_Commitquelle_nicht_zeigbar_ist_dann_Exit_2_mit_genau_einer_Zeile(string pfad, string grund)
    {
        using var c = RepoC.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(c.Ordner, "--dateien", $"{c.C1}:{pfad}", "--kein-browser");

        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(2));
        Assert.That(lauf.Ausgabe, Is.Empty);
        Assert.That(lauf.Fehler, Does.Not.Contain("http://127.0.0.1"));
        Assert.That(NichtLeereZeilen(lauf.Fehler), Is.EqualTo(1));
        Assert.That(lauf.Fehler, Does.Contain("FEHLER [Dateiansicht]"));
        Assert.That(lauf.Fehler, Does.Contain(grund));
    }

    [Test]
    public async Task Wenn_der_Commit_unbekannt_ist_dann_Commit_nicht_gefunden()
    {
        using var c = RepoC.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(c.Ordner, "--dateien", "deadbeef:sql/a.sql", "--kein-browser");

        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(2));
        Assert.That(lauf.Ausgabe, Is.Empty);
        Assert.That(lauf.Fehler, Does.Contain("Commit nicht gefunden"));
        Assert.That(NichtLeereZeilen(lauf.Fehler), Is.EqualTo(1));
    }

    [Test]
    public async Task Wenn_der_Pfad_leer_ist_dann_ist_die_Angabe_ein_Datentraegerpfad()
    {
        using var c = RepoC.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(c.Ordner, "--dateien", $"{c.C1}:", "--kein-browser");

        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(2));
        Assert.That(lauf.Fehler, Does.Contain("Datei nicht gefunden"));
    }

    [Test]
    public async Task Wenn_Punkt_Schraegstrich_vorn_steht_dann_ist_die_Angabe_ein_Datentraegerpfad()
    {
        using var c = RepoC.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(c.Ordner, "--dateien", $"./{c.C1}:sql/a.sql", "--kein-browser");

        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(2));
        Assert.That(lauf.Fehler, Does.Contain("Datei nicht gefunden"));
    }

    [Test]
    public async Task Wenn_der_Name_einen_Zeilenumbruch_traegt_dann_Name_nicht_uebergebbar_ohne_git()
    {
        using var c = RepoC.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(c.Ordner, "--dateien", $"{c.C1}:sql/a\nb.sql", "--kein-browser");

        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(2));
        Assert.That(lauf.Ausgabe, Is.Empty);
        Assert.That(lauf.Fehler, Does.Contain("Name nicht übergebbar (ungültiges Byte oder Ersatzzeichen U+FFFD)"));
        Assert.That(NichtLeereZeilen(lauf.Fehler), Is.EqualTo(1));
    }

    [Test]
    public async Task Wenn_ein_Tag_wie_das_Praefix_heisst_dann_mehrdeutig_und_kein_Inhalt()
    {
        using var c = RepoC.Anlegen();
        var praefix = c.C2[..7];
        Assert.That(c.C1.StartsWith(praefix, StringComparison.OrdinalIgnoreCase), Is.False);
        c.Git("tag", praefix, c.C1);
        using var lauf = await Dateiansichtprozess.StarteAsync(c.Ordner, "--dateien", $"{praefix}:sql/a.sql", "--kein-browser");

        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(2));
        Assert.That(lauf.Fehler, Does.Contain("vollen Hash angeben"));
    }

    [Test]
    public async Task Wenn_refs_replace_c1_ersetzt_dann_der_echte_Inhalt()
    {
        using var c = RepoC.Anlegen();
        c.Git("replace", c.C1, c.C2); // Ersatzcommit unter dem echten Hash
        using var lauf = await Dateiansichtprozess.StarteAsync(c.Ordner, "--dateien", $"{c.C1}:sql/a.sql", "--kein-browser", "--port", "0");

        var text = await lauf.AbrufenAsync("api/dateiansicht/0");
        await lauf.SchliessenAsync();
        await lauf.WarteAufEndeAsync();

        using var dokument = JsonDocument.Parse(text.Koerper);
        Assert.That(dokument.RootElement.GetProperty("text").GetString(), Is.EqualTo("SELECT 1;\n"));
    }

    [Test]
    public async Task Wenn_der_Name_unsichtbare_Zeichen_traegt_dann_steht_er_mit_Marken_in_der_Liste()
    {
        using var c = RepoC.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(c.Ordner, "--dateien", $"{c.C1}:x\u202e.sql", "--kein-browser", "--port", "0");

        var liste = await lauf.AbrufenAsync("api/dateiansicht");
        await lauf.SchliessenAsync();
        await lauf.WarteAufEndeAsync();

        Assert.That(liste.Status, Is.EqualTo(200));
        using var dokument = JsonDocument.Parse(liste.Koerper);
        var name = dokument.RootElement.GetProperty("dateien")[0].GetProperty("anzeigename").GetString();
        Assert.That(name, Is.EqualTo($"{c.C1[..7]}:x⟨U+202E⟩.sql"));
        Assert.That(name, Does.Not.Contain('\u202E'));
    }

    [Test]
    public async Task Wenn_ohne_Repository_dann_Exit_2_mit_dem_Wortlaut_aus_R00016()
    {
        using var d = OrdnerD.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", "abcdef01:sql/a.sql", "--kein-browser");

        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(2));
        Assert.That(lauf.Ausgabe, Is.Empty);
        Assert.That(lauf.Fehler, Does.Contain("Kein Git-Repository"));
        Assert.That(lauf.Fehler, Does.Not.Contain("http://127.0.0.1"));
        Assert.That(NichtLeereZeilen(lauf.Fehler), Is.EqualTo(1));
    }

    [Test]
    public async Task Wenn_Datentraeger_und_Commit_ohne_Repository_gemischt_sind_dann_nur_die_Commitquelle_scheitert()
    {
        using var d = OrdnerD.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", "a.sql", "abcdef01:sql/a.sql", "--kein-browser");

        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(2));
        Assert.That(lauf.Fehler, Does.Contain("Kein Git-Repository"));
        Assert.That(lauf.Fehler, Does.Not.Contain("a.sql: Datei nicht gefunden"), "die Datenträger-Angabe ist fehlerfrei");
        Assert.That(NichtLeereZeilen(lauf.Fehler), Is.EqualTo(1));
    }

    [Test]
    public async Task Wenn_die_Commitquelle_gezeigt_wird_dann_startet_kein_Fremdprogramm_und_der_Inhalt_ist_der_Blob()
    {
        using var c = RepoC.Anlegen();
        var marker = Markerkonfiguration(c);
        var pfadVorher = Environment.GetEnvironmentVariable("PATH") ?? string.Empty;
        using var lauf = await Dateiansichtprozess.StarteMitUmgebungAsync(
            c.Ordner,
            ["--dateien", $"{c.C1}:sql/a.sql", "--kein-browser", "--port", "0"],
            new Dictionary<string, string> { ["PATH"] = $"{marker.Markerbin}:{pfadVorher}" },
            stdinOffen: false);

        var text = await lauf.AbrufenAsync("api/dateiansicht/0");
        await lauf.SchliessenAsync();
        await lauf.WarteAufEndeAsync();

        using var dokument = JsonDocument.Parse(text.Koerper);
        Assert.That(dokument.RootElement.GetProperty("text").GetString(), Is.EqualTo("SELECT 1;\n"), "der Blob ohne Umwandlung");
        Assert.That(File.Exists(marker.Programmmarker), Is.False, "kein Fremdprogramm aus der Konfiguration");
        var aufrufe = await File.ReadAllTextAsync(marker.Aufruflog);
        Assert.That(aufrufe, Does.Contain("rev-parse"), "Auflösen läuft über git");
        Assert.That(aufrufe, Does.Contain("ls-tree"), "der Eintrag läuft über git");
        Assert.That(aufrufe, Does.Contain("cat-file"), "der Blob läuft über git");
    }

    [Test]
    public async Task Wenn_der_Commitpfad_ein_rohes_ungueltiges_Byte_hat_dann_Exit_2_und_nie_der_Inhalt_der_Ersatzdatei()
    {
        using var c = RepoC.Anlegen();
        var skript = Path.Combine(c.Ordner, "starte-mit-rohbyte.py");
        // Der rohe Pfadname `f\xff.sql` geht über ein python-Bytes-Literal an argv; .NET gäbe ihn als U+FFFD weiter.
        await File.WriteAllTextAsync(skript, $"""
            import os, sys
            dll, dotnet = sys.argv[1], sys.argv[2]
            angabe = b'{c.C1}:f\xff.sql'
            os.execve(dotnet.encode(), [dotnet.encode(), dll.encode(), b'--dateien', angabe, b'--kein-browser'], os.environ)
            """);
        var start = new ProcessStartInfo("python3")
        {
            WorkingDirectory = c.Ordner,
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

        Assert.That(prozess.ExitCode, Is.EqualTo(2));
        Assert.That(ausgabe, Is.Empty);
        Assert.That(fehler, Does.Contain("Name nicht übergebbar"));
        Assert.That(fehler, Does.Not.Contain("INHALT-RAW"));
        Assert.That(fehler, Does.Not.Contain("INHALT-FFFD"));
        Assert.That(fehler, Does.Not.Contain("http://127.0.0.1"));
    }

    [Test]
    public async Task Wenn_drei_8_MiB_Dateien_und_zwei_8_MiB_Commitquellen_gemischt_sind_dann_eine_gemeinsame_Summe()
    {
        using var repo = WegwerfRepo.OhneCommits();
        var acht = new byte[8_388_608];
        Array.Fill(acht, (byte)'a');
        Schreib(repo.Ordner, "c0.sql", acht);
        Schreib(repo.Ordner, "c1.sql", acht);
        repo.Git("add", "-A");
        var hash = repo.CommitteIndex("gross", "A", "2026-01-01T10:00:00");
        Schreib(repo.Ordner, "d0.sql", acht);
        Schreib(repo.Ordner, "d1.sql", acht);
        Schreib(repo.Ordner, "d2.sql", acht);
        var buchung = new Quellenbuchung();
        var interactor = new DateiansichtStartInteractor(new DateiLeser(buchung), new GitCommitDateiquelle(repo.Ordner, buchung));
        var angaben = new[] { "d0.sql", "d1.sql", "d2.sql" }.Select(name => Path.Combine(repo.Ordner, name)).ToList();
        angaben.Add($"{hash}:c0.sql");
        angaben.Add($"{hash}:c1.sql");

        var ausgang = interactor.Starte(new Dateiaufruf(angaben, 0, BrowserOeffnen: false, Protokollstufe.Warnung));

        Assert.That(ausgang.IstErfolg, Is.False);
        Assert.That(ausgang.Stand, Is.Null);
        Assert.That(ausgang.Fehler, Has.Count.EqualTo(1));
        Assert.That(ausgang.Fehler[0].Grund?.Art, Is.EqualTo(Quellengrundart.ZusammenZuGross));
        Assert.That(QuellengrundMeldungen.Meldung(ausgang.Fehler[0].Grund!), Is.EqualTo("zusammen zu groß (über 32 MiB)"));
    }

    private static void Schreib(string ordner, string name, byte[] inhalt)
    {
        File.WriteAllBytes(Path.Combine(ordner, name), inhalt);
    }

    /// <summary>Fremde Konfiguration, die Programme startet (Matrix C10): Textconv, Filter, fsmonitor, Signatur, Lazy-Fetch.</summary>
    private static (string Markerbin, string Programmmarker, string Aufruflog) Markerkonfiguration(RepoC c)
    {
        var markerbin = Path.Combine(c.Ordner, "marker-bin");
        Directory.CreateDirectory(markerbin);
        var programmmarker = Path.Combine(c.Ordner, "marker-programm.txt");
        var aufruflog = Path.Combine(c.Ordner, "git-aufruf.txt");
        var skript = Path.Combine(markerbin, "marker.sh");
        File.WriteAllText(skript, $"#!/bin/sh\necho \"$0 $@\" >> '{programmmarker}'\nexit 0\n");
        Ausfuehrbar(skript);
        c.Git("config", "diff.marker.textconv", skript);
        c.Git("config", "filter.marker.smudge", skript);
        c.Git("config", "core.fsmonitor", skript);
        c.Git("config", "log.showSignature", "true");
        c.Git("config", "gpg.program", skript);
        c.Git("config", "remote.origin.uploadpack", skript);
        File.WriteAllText(Path.Combine(c.Ordner, ".gitattributes"), "*.sql diff=marker filter=marker\n");
        var gitSkript = Path.Combine(markerbin, "git");
        File.WriteAllText(gitSkript, $"#!/bin/sh\necho \"$@\" >> '{aufruflog}'\nexec /usr/bin/git \"$@\"\n");
        Ausfuehrbar(gitSkript);
        return (markerbin, programmmarker, aufruflog);
    }

    private static void Ausfuehrbar(string pfad)
    {
        if (OperatingSystem.IsLinux() || OperatingSystem.IsMacOS())
        {
            File.SetUnixFileMode(pfad, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute | UnixFileMode.GroupRead | UnixFileMode.GroupExecute | UnixFileMode.OtherRead | UnixFileMode.OtherExecute);
        }
    }

    private static string DotnetPfad()
    {
        using var which = Process.Start(new ProcessStartInfo("which", "dotnet") { RedirectStandardOutput = true });
        var pfad = which?.StandardOutput.ReadToEnd().Trim() ?? "dotnet";
        which?.WaitForExit();
        return pfad;
    }

    private static int NichtLeereZeilen(string fehler)
    {
        return fehler.Split('\n').Count(zeile => zeile.Trim().Length > 0);
    }
}
