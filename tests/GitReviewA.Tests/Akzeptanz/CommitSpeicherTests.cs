using System.Diagnostics;
using System.Runtime.Versioning;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Kriterium 13 (L4) der User Story R00048: die Abweisung wegen 20 MiB + 6 MiB Message darf keine Speicherspitze weit über
/// dem Grundverbrauch des Programms erzeugen. Gemessen wird als **Kontrollpaar** gegen einen Lauf desselben Programms mit
/// kleiner Auswahl, weil die absolute Spitze der .NET-Laufzeit (rund 180 MB für dieses Programm, gemessen) jede absolute
/// Schranke von 128 MiB unerreichbar macht — die Schranke des Kriteriums ist eine grobe Schranke gegen den Einbruch nach
/// 514 MB, keine enge Marge (Betreiber 2026-11-26, keine harten Performance-Ziele). Ebene: Prozessprobe über <c>/usr/bin/time -v</c>.
/// </summary>
[Platform(Exclude = "Win", Reason = "Wegwerf-Repos, git-Aufrufe und /usr/bin/time")]
[UnsupportedOSPlatform("windows")]
public class CommitSpeicherTests
{
    /// <summary>Zuwachs gegenüber dem Grundverbrauch, der noch als „kein Einbruch“ gilt.</summary>
    private const int HoechsterZuwachsKiB = 64 * 1024;

    [Test]
    [Description("Kriterium 13: Abweisung mit 20 MiB + 6 MiB Message — die Speicherspitze liegt höchstens 64 MiB über dem Grundverbrauch")]
    public async Task Wenn_zwei_riesige_Messages_abgewiesen_werden_dann_kein_Speichereinbruch()
    {
        using var f = CommitRepo.F();
        var dll = typeof(GitReviewA.Aufruf.Aufrufleser).Assembly.Location;

        var grund = await LaufeMitZeitmessung(f.Ordner, dll, "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef");
        var riesig = await LaufeMitZeitmessung(f.Ordner, dll, f.Hash("h"), f.Hash("i"));

        Assert.That(grund.ExitCode, Is.EqualTo(2), "der Grundlauf endet als ungültiger Aufruf, ohne Server");
        Assert.That(grund.Fehler, Does.Not.Contain("8 MiB"), "der Grundlauf liest eine kleine Ausgabe");
        Assert.That(riesig.ExitCode, Is.EqualTo(2), "die Auswahl h+i wird abgewiesen");
        Assert.That(riesig.Fehler, Does.Contain("8 MiB"));
        Assert.That(grund.SpitzeKiB, Is.GreaterThan(0), "die Messung selbst muss greifen");
        var zuwachs = riesig.SpitzeKiB - grund.SpitzeKiB;
        Assert.That(zuwachs, Is.LessThan(HoechsterZuwachsKiB), $"Spitze {riesig.SpitzeKiB} KiB gegen Grundverbrauch {grund.SpitzeKiB} KiB (heute rot: 514 652 kB bei 27 MB Ausgabe)");
    }

    private static async Task<(int ExitCode, string Fehler, int SpitzeKiB)> LaufeMitZeitmessung(string ordner, string dll, params string[] hashes)
    {
        var start = new ProcessStartInfo("/usr/bin/time")
        {
            WorkingDirectory = ordner,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
        };
        start.ArgumentList.Add("-v");
        start.ArgumentList.Add("dotnet");
        start.ArgumentList.Add(dll);
        foreach (var hash in hashes)
        {
            start.ArgumentList.Add(hash);
        }
        start.ArgumentList.Add("--kein-browser");
        using var prozess = Process.Start(start) ?? throw new InvalidOperationException("/usr/bin/time startet nicht");
        var ausgabe = prozess.StandardOutput.ReadToEndAsync();
        var fehler = prozess.StandardError.ReadToEndAsync();
        using var frist = new CancellationTokenSource(TimeSpan.FromSeconds(60));
        try
        {
            await prozess.WaitForExitAsync(frist.Token);
        }
        catch (OperationCanceledException)
        {
            prozess.Kill(entireProcessTree: true);
            await prozess.WaitForExitAsync();
        }
        var ausgabeText = await ausgabe;
        var fehlerText = await fehler;
        Assert.That(ausgabeText, Is.Empty, "stdout bleibt leer");
        return (prozess.ExitCode, fehlerText, SpitzeAus(fehlerText));
    }

    /// <summary>„Maximum resident set size (kbytes): 12345“ aus der Ausgabe von <c>time -v</c>.</summary>
    private static int SpitzeAus(string text)
    {
        var zeile = text.Split('\n').FirstOrDefault(z => z.Contains("Maximum resident set size", StringComparison.Ordinal));
        if (zeile is null)
        {
            return 0;
        }
        var zahl = zeile.Split(':')[^1].Trim();
        return int.TryParse(zahl, System.Globalization.CultureInfo.InvariantCulture, out var wert) ? wert : 0;
    }
}
