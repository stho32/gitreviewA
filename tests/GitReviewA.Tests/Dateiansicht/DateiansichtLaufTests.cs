using System.Net;
using System.Net.Sockets;
using System.Text.Json;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Dateiansicht;

/// <summary>
/// R00043 Kriterien 1–3 und 7 als Prozess: Startzeile, Liste, Text, „Schließen“ mit Exit 0, Signal mit 130, je Grund Exit 2
/// vor dem Server, stdout in jedem Ausgang 0 Bytes. Start aus dem Ordner D, ohne Browser.
/// </summary>
[NonParallelizable]
public class DateiansichtLaufTests
{
    [Test]
    public async Task Wenn_a_sql_gezeigt_wird_dann_eine_Datei_in_der_Liste_ihr_Text_und_Schliessen_endet_mit_0_und_leerem_stdout()
    {
        using var d = OrdnerD.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", "a.sql", "--kein-browser", "--port", "0");

        var liste = await lauf.AbrufenAsync("api/dateiansicht");
        var text = await lauf.AbrufenAsync("api/dateiansicht/0");
        var geschlossen = await lauf.SchliessenAsync();
        var ende = await lauf.WarteAufEndeAsync();

        using var dokument = JsonDocument.Parse(liste.Koerper);
        var dateien = dokument.RootElement.GetProperty("dateien").EnumerateArray().ToList();
        Assert.That(dateien, Has.Count.EqualTo(1));
        Assert.That(dateien[0].GetProperty("nummer").GetInt32(), Is.EqualTo(0));
        Assert.That(dateien[0].GetProperty("zeilen").GetInt32(), Is.EqualTo(3));
        Assert.That(dateien[0].GetProperty("kodierung").GetString(), Is.EqualTo("UTF-8"));
        Assert.That(dateien[0].GetProperty("zeilenende").GetString(), Is.EqualTo("LF"));
        using var textdokument = JsonDocument.Parse(text.Koerper);
        Assert.That(textdokument.RootElement.GetProperty("text").GetString(), Is.EqualTo(File.ReadAllText(d.Pfad("a.sql"))));
        Assert.That((liste.Status, text.Status, geschlossen.Status), Is.EqualTo((200, 200, 200)));
        Assert.That(ende, Is.EqualTo(0));
        Assert.That(lauf.Ausgabe, Is.Empty);
        Assert.That(lauf.Fehler, Does.Contain("gitreviewA läuft auf http://127.0.0.1:"));
    }

    [Test]
    public async Task Wenn_ein_Beendigungssignal_kommt_dann_130_und_Review_abgebrochen_ohne_stdout()
    {
        using var d = OrdnerD.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", "a.sql", "--kein-browser", "--port", "0");
        Assert.That(lauf.Adresse, Is.Not.Null);

        await lauf.SendeSigtermAsync();
        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(130));
        Assert.That(lauf.Ausgabe, Is.Empty);
        Assert.That(lauf.Fehler, Does.Contain("Review abgebrochen"));
    }

    [Test]
    public async Task Wenn_die_Datei_fehlt_dann_Exit_2_genau_eine_Fehlerzeile_und_kein_Server()
    {
        using var d = OrdnerD.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", "fehlt.sql", "--kein-browser");

        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(2));
        Assert.That(lauf.Ausgabe, Is.Empty);
        Assert.That(lauf.Fehler, Does.Not.Contain("http://127.0.0.1"));
        Assert.That(Fehlerzeilen(lauf.Fehler), Is.EqualTo(1));
        Assert.That(lauf.Fehler, Does.Contain("FEHLER [Dateiansicht] fehlt.sql: Datei nicht gefunden"));
    }

    [Test]
    public async Task Wenn_eine_FIFO_ohne_Schreiber_genannt_wird_dann_Exit_2_in_unter_fuenf_Sekunden_ohne_Haengen()
    {
        using var d = OrdnerD.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", "fifo.sql", "--kein-browser");

        var ende = await lauf.WarteAufEndeAsync(TimeSpan.FromSeconds(5));

        Assert.That(ende, Is.EqualTo(2));
        Assert.That(lauf.Ausgabe, Is.Empty);
        Assert.That(lauf.Fehler, Does.Contain("keine reguläre Datei"));
        Assert.That(lauf.Fehler, Does.Not.Contain("http://127.0.0.1"));
        Assert.That(Fehlerzeilen(lauf.Fehler), Is.EqualTo(1));
    }

    [Test]
    public async Task Wenn_dateien_mit_einer_Option_ohne_Doppelstrich_startet_dann_Exit_2_ohne_Server()
    {
        using var d = OrdnerD.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", "-x.sql", "--kein-browser");

        var ende = await lauf.WarteAufEndeAsync(TimeSpan.FromSeconds(10));

        Assert.That(ende, Is.EqualTo(2));
        Assert.That(lauf.Ausgabe, Is.Empty);
        Assert.That(lauf.Fehler, Does.Contain("unbekannte Option"));
        Assert.That(lauf.Fehler, Does.Not.Contain("http://127.0.0.1"));
    }

    [Test]
    public async Task Wenn_nach_dem_Doppelstrich_eine_Datei_mit_Minus_steht_dann_zeigt_die_Dateiansicht_sie()
    {
        using var d = OrdnerD.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", "--kein-browser", "--port", "0", "--", "-x.sql");

        var text = await lauf.AbrufenAsync("api/dateiansicht/0");
        var geschlossen = await lauf.SchliessenAsync();
        var ende = await lauf.WarteAufEndeAsync();

        using var dokument = JsonDocument.Parse(text.Koerper);
        Assert.That(dokument.RootElement.GetProperty("text").GetString(), Is.EqualTo(File.ReadAllText(d.Pfad("-x.sql"))));
        Assert.That((text.Status, geschlossen.Status), Is.EqualTo((200, 200)));
        Assert.That(ende, Is.EqualTo(0));
        Assert.That(lauf.Ausgabe, Is.Empty);
    }

    [Test]
    public async Task Wenn_ein_Hash_neben_dateien_steht_dann_Exit_2_ohne_Server()
    {
        using var d = OrdnerD.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", "a.sql", "a1b2c3d4", "--kein-browser");

        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(2));
        Assert.That(lauf.Ausgabe, Is.Empty);
        Assert.That(lauf.Fehler, Does.Contain("Review oder Dateiansicht, nicht beides"));
        Assert.That(lauf.Fehler, Does.Not.Contain("http://127.0.0.1"));
    }

    [TestCase("--dateien")]
    [TestCase("--dateien", "a.sql", "-")]
    [TestCase("--dateien", "a.sql", "--ignore", "*.md")]
    public async Task Wenn_der_Aufruf_beides_waere_dann_Exit_2(params string[] argumente)
    {
        using var d = OrdnerD.Anlegen();
        var mitOptionen = argumente.Append("--kein-browser").ToArray();
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, mitOptionen);

        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(2));
        Assert.That(lauf.Ausgabe, Is.Empty);
        Assert.That(lauf.Fehler, Is.Not.Empty);
        Assert.That(lauf.Fehler, Does.Not.Contain("http://127.0.0.1"));
    }

    [Test]
    public async Task Wenn_ein_symbolischer_Link_genannt_wird_dann_Exit_2_mit_seinem_Grund()
    {
        using var d = OrdnerD.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", "link.sql", "--kein-browser");

        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(2));
        Assert.That(lauf.Fehler, Does.Contain("ist ein symbolischer Link — bitte das Ziel nennen"));
    }

    [Test]
    public async Task Wenn_der_Name_unsichtbare_Zeichen_traegt_dann_steht_er_nur_mit_Marken_auf_stderr()
    {
        using var d = OrdnerD.Anlegen();
        var angabe = "fehlt\u202e\u200b\U000E0041.sql";
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", angabe, "--kein-browser");

        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(2));
        Assert.That(lauf.Fehler, Does.Contain("⟨U+202E⟩"));
        Assert.That(lauf.Fehler, Does.Contain("⟨U+200B⟩"));
        Assert.That(lauf.Fehler, Does.Contain("⟨U+E0041⟩"));
        Assert.That(lauf.Fehler.IndexOf('\u202E', StringComparison.Ordinal), Is.EqualTo(-1));
        Assert.That(lauf.Fehler.IndexOf('\u200B', StringComparison.Ordinal), Is.EqualTo(-1));
        Assert.That(lauf.Fehler.Contains("\U000E0041", StringComparison.Ordinal), Is.False);
        Assert.That(Fehlerzeilen(lauf.Fehler), Is.EqualTo(1));
    }

    [Test]
    public async Task Wenn_proc_self_mem_scheitert_dann_Exit_2_ohne_Stacktrace()
    {
        using var d = OrdnerD.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", "/proc/self/mem", "--kein-browser");

        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(2));
        Assert.That(lauf.Fehler, Does.Contain("Datei nicht lesbar"));
        Assert.That(lauf.Fehler, Does.Not.Contain("   at "));
        Assert.That(Fehlerzeilen(lauf.Fehler), Is.EqualTo(1));
    }

    [Test]
    public async Task Wenn_der_Port_belegt_ist_dann_Exit_1_mit_genau_einer_Serverzeile_ohne_Stacktrace_in_beiden_Laufarten()
    {
        using var d = OrdnerD.Anlegen();
        using var belegung = new TcpListener(IPAddress.Loopback, 0);
        belegung.Start();
        var port = ((IPEndPoint)belegung.LocalEndpoint).Port.ToString(System.Globalization.CultureInfo.InvariantCulture);

        using (var dateiansicht = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", "a.sql", "--kein-browser", "--port", port))
        {
            PruefeServerzeile(await dateiansicht.WarteAufEndeAsync(TimeSpan.FromSeconds(10)), dateiansicht);
        }

        using var repo = WegwerfRepo.MitCommits("Erster Stand");
        using var review = await Dateiansichtprozess.StarteAsync(repo.Ordner, repo.Hashes[0], "--kein-browser", "--port", port);
        PruefeServerzeile(await review.WarteAufEndeAsync(TimeSpan.FromSeconds(10)), review);
    }

    [Test]
    public async Task Wenn_der_Pfad_5000_Zeichen_hat_dann_Exit_2_mit_einer_hoechstens_400_Zeichen_langen_Zeile()
    {
        using var d = OrdnerD.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", new string('a', 5000), "--kein-browser");

        var ende = await lauf.WarteAufEndeAsync();

        Assert.That(ende, Is.EqualTo(2));
        var zeile = Fehlerzeilen(lauf.Fehler);
        var laengste = lauf.Fehler.Split('\n').Select(text => text.TrimEnd('\r')).Where(text => text.Length > 0).Max(text => text.Length);
        Assert.That(zeile, Is.EqualTo(1));
        Assert.That(laengste, Is.LessThanOrEqualTo(400));
    }

    [Test]
    public async Task Wenn_a_sql_nach_dem_Start_geloescht_wird_dann_zeigt_das_Neuladen_den_Stand_vom_Start()
    {
        using var d = OrdnerD.Anlegen();
        using var lauf = await Dateiansichtprozess.StarteAsync(d.Ordner, "--dateien", "a.sql", "--kein-browser", "--port", "0");
        var vorher = await lauf.AbrufenAsync("api/dateiansicht/0");

        File.Delete(d.Pfad("a.sql"));
        using var fifo = System.Diagnostics.Process.Start("mkfifo", d.Pfad("a.sql"));
        fifo?.WaitForExit();
        var nachher = await lauf.AbrufenAsync("api/dateiansicht/0");

        Assert.That(nachher.Status, Is.EqualTo(200));
        Assert.That(nachher.Koerper, Is.EqualTo(vorher.Koerper));
    }

    [Test]
    public async Task Wenn_der_Lauf_im_Hintergrund_gestartet_und_mit_StrgC_abgebrochen_wird_dann_130_und_Review_abgebrochen()
    {
        using var d = OrdnerD.Anlegen();
        var dll = typeof(GitReviewA.Aufruf.Aufrufleser).Assembly.Location;
        var dotnet = DotnetPfad();
        var fehlerdatei = Path.Combine(d.Ordner, "stderr.txt");
        var codedatei = Path.Combine(d.Ordner, "exit.txt");
        var pidDatei = Path.Combine(d.Ordner, "pid.txt");
        var befehl = $"{dotnet} '{dll}' --dateien a.sql --kein-browser --port 0 2>'{fehlerdatei}' & echo $! > '{pidDatei}'; wait $!; echo $? > '{codedatei}'";
        using var bash = System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("bash", ["-c", befehl])
        {
            WorkingDirectory = d.Ordner,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        }) ?? throw new InvalidOperationException("bash startet nicht");

        await WarteAufInhalt(fehlerdatei, "http://127.0.0.1:");
        var pid = int.Parse((await File.ReadAllTextAsync(pidDatei)).Trim(), System.Globalization.CultureInfo.InvariantCulture);
        using (var kill = System.Diagnostics.Process.Start("kill", ["-INT", pid.ToString(System.Globalization.CultureInfo.InvariantCulture)]))
        {
            kill?.WaitForExit();
        }
        await bash.WaitForExitAsync();

        var fehler = await File.ReadAllTextAsync(fehlerdatei);
        var code = (await File.ReadAllTextAsync(codedatei)).Trim();
        Assert.That(code, Is.EqualTo("130"));
        Assert.That(fehler, Does.Contain("Review abgebrochen"));
        Assert.That(bash.StandardOutput.ReadToEnd(), Is.Empty);
    }

    private static async Task WarteAufInhalt(string pfad, string text)
    {
        var frist = System.Diagnostics.Stopwatch.StartNew();
        while (frist.Elapsed < TimeSpan.FromSeconds(20))
        {
            if (File.Exists(pfad) && (await File.ReadAllTextAsync(pfad)).Contains(text, StringComparison.Ordinal))
            {
                return;
            }
            await Task.Delay(20);
        }
        Assert.Fail($"„{text}“ erschien nicht in {pfad}");
    }

    private static string DotnetPfad()
    {
        using var which = System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("which", "dotnet") { RedirectStandardOutput = true });
        var pfad = which?.StandardOutput.ReadToEnd().Trim() ?? "dotnet";
        which?.WaitForExit();
        return pfad;
    }

    private static int Fehlerzeilen(string fehler)
    {
        return fehler.Split('\n').Count(zeile => zeile.Contains("[Dateiansicht]", StringComparison.Ordinal));
    }

    private static int NichtLeereZeilen(string fehler)
    {
        return fehler.Split('\n').Count(zeile => zeile.Trim().Length > 0);
    }

    /// <summary>Ein belegter Port ist ein Laufzeitfehler: Exit 1, genau eine `FEHLER [Server]`-Zeile, kein Stacktrace, stdout leer.</summary>
    private static void PruefeServerzeile(int ende, Dateiansichtprozess lauf)
    {
        Assert.That(ende, Is.EqualTo(1));
        Assert.That(lauf.Ausgabe, Is.Empty);
        Assert.That(lauf.Fehler, Does.Contain("FEHLER [Server] Server ließ sich nicht starten"));
        Assert.That(lauf.Fehler, Does.Not.Contain("Unhandled exception"));
        Assert.That(lauf.Fehler, Does.Not.Contain("   at "));
        Assert.That(NichtLeereZeilen(lauf.Fehler), Is.EqualTo(1));
    }
}
