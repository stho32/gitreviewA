using System.Diagnostics;
using System.Net;
using System.Runtime.Versioning;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Treiber Prozess für R00020: startet das gebaute Programm (`gitreviewA.dll`) als echten Prozess im Wegwerf-Repo auf freiem Port,
/// liest die Startzeile aus stderr und spricht `/api/ergebnis`, `/api/anmerkungen`, `/api/haken` und `/api/beenden`. stdout bleibt roh,
/// damit „Byte für Byte“ als Bytevergleich geprüft wird.
/// </summary>
[UnsupportedOSPlatform("windows")]
internal sealed class ErgebnisKopierenTreiber : IAsyncDisposable
{
    private const int Fristsekunden = 20;
    private const int Puffergroesse = 4096;
    private static readonly TimeSpan Startfrist = TimeSpan.FromSeconds(Fristsekunden);
    private static readonly TimeSpan Endfrist = TimeSpan.FromSeconds(Fristsekunden);
    private static readonly Regex Startzeile = new(@"http://127\.0\.0\.1:(?<port>\d+)/");

    private readonly Process prozess;
    private readonly MemoryStream standardausgabe;
    private readonly StringBuilder fehlerausgabe;
    private readonly HttpClient client = new();
    private Task ausgabeLesen = Task.CompletedTask;
    private bool wurdeBeendet;

    private ErgebnisKopierenTreiber(Process prozess, MemoryStream standardausgabe, StringBuilder fehlerausgabe)
    {
        this.prozess = prozess;
        this.standardausgabe = standardausgabe;
        this.fehlerausgabe = fehlerausgabe;
    }

    public string Adresse { get; private set; } = string.Empty;

    public bool LaeuftNoch => !prozess.HasExited;

    public string Fehlerausgabe
    {
        get
        {
            lock (fehlerausgabe)
            {
                return fehlerausgabe.ToString();
            }
        }
    }

    public static async Task<ErgebnisKopierenTreiber> StartenAsync(string ordner, params string[] hashes)
    {
        var start = new ProcessStartInfo("dotnet")
        {
            WorkingDirectory = ordner,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        };
        start.ArgumentList.Add(typeof(Program).Assembly.Location);
        foreach (var hash in hashes)
        {
            start.ArgumentList.Add(hash);
        }
        start.ArgumentList.Add("--kein-browser");
        start.ArgumentList.Add("--port");
        start.ArgumentList.Add("0");
        var prozess = Process.Start(start)!;
        var standardausgabe = new MemoryStream();
        var fehlerausgabe = new StringBuilder();
        var treiber = new ErgebnisKopierenTreiber(prozess, standardausgabe, fehlerausgabe);
        var startzeile = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
        prozess.ErrorDataReceived += (_, zeile) =>
        {
            if (zeile.Data is null)
            {
                return;
            }
            lock (fehlerausgabe)
            {
                fehlerausgabe.AppendLine(zeile.Data);
            }
            var treffer = Startzeile.Match(zeile.Data);
            if (treffer.Success)
            {
                startzeile.TrySetResult(treffer.Value);
            }
        };
        treiber.ausgabeLesen = treiber.LiesStandardausgabeAsync(prozess);
        prozess.BeginErrorReadLine();
        prozess.EnableRaisingEvents = true;
        prozess.Exited += (_, _) => startzeile.TrySetException(new InvalidOperationException($"gitreviewA endete vor der Startzeile mit {prozess.ExitCode}"));
        treiber.Adresse = await startzeile.Task.WaitAsync(Startfrist);
        return treiber;
    }

    public Task<Kopierantwort> KopiereAsync(string? host = null, string methode = "GET")
    {
        return SendeAsync(methode, "api/ergebnis", null, host);
    }

    public Task<Kopierantwort> AnnotiereAsync(string commit, string datei, int zeile, string text)
    {
        var koerper = JsonSerializer.Serialize(new { commit, datei, zeile, text });
        return SendeAsync("POST", "api/anmerkungen", koerper, null);
    }

    /// <summary>Eine Anmerkung mit `art` im Körper (R00036); `art` ist `muss`, `frage`, `idee` oder `null` („ohne“).</summary>
    public Task<Kopierantwort> AnnotiereMitArtAsync(string commit, string datei, int? zeile, string text, string? art, int? von = null, int? bis = null)
    {
        var koerper = JsonSerializer.Serialize(new { commit, datei, zeile, text, von, bis, art });
        return SendeAsync("POST", "api/anmerkungen", koerper, null);
    }

    /// <summary>Den Text und die Art einer Anmerkung ändern (R00036); `art` `null` entfernt die Art.</summary>
    public Task<Kopierantwort> AendereMitArtAsync(int nummer, string text, string? art)
    {
        var koerper = JsonSerializer.Serialize(new { text, art });
        return SendeAsync("POST", $"api/anmerkungen/{nummer}", koerper, null);
    }

    public Task<Kopierantwort> HakeAsync(string commit, string datei, bool abgehakt)
    {
        var koerper = JsonSerializer.Serialize(new { commit, datei, abgehakt });
        return SendeAsync("POST", "api/haken", koerper, null);
    }

    public Task<Kopierantwort> BeendeAsync()
    {
        return SendeAsync("POST", "api/beenden", "{}", null);
    }

    /// <summary>Wartet auf das Prozessende, sammelt die restliche Ausgabe und liefert den Exit-Code.</summary>
    public async Task<int> WarteAufEndeAsync()
    {
        await prozess.WaitForExitAsync().WaitAsync(Endfrist);
        await ausgabeLesen.WaitAsync(Endfrist);
        wurdeBeendet = true;
        return prozess.ExitCode;
    }

    /// <summary>stdout als Bytes, wie sie das Programm geschrieben hat (UTF-8 ohne BOM, LF).</summary>
    public byte[] Standardausgabe()
    {
        lock (standardausgabe)
        {
            return standardausgabe.ToArray();
        }
    }

    public string StandardausgabeAlsText()
    {
        return Encoding.UTF8.GetString(Standardausgabe());
    }

    public async ValueTask DisposeAsync()
    {
        client.Dispose();
        if (!wurdeBeendet && !prozess.HasExited)
        {
            prozess.Kill(entireProcessTree: true);
            await prozess.WaitForExitAsync().WaitAsync(Endfrist);
        }
        prozess.Dispose();
    }

    private async Task LiesStandardausgabeAsync(Process lauf)
    {
        var puffer = new byte[Puffergroesse];
        var quelle = lauf.StandardOutput.BaseStream;
        while (true)
        {
            var gelesen = await quelle.ReadAsync(puffer);
            if (gelesen == 0)
            {
                return;
            }
            lock (standardausgabe)
            {
                standardausgabe.Write(puffer, 0, gelesen);
            }
        }
    }

    private async Task<Kopierantwort> SendeAsync(string methode, string pfad, string? koerper, string? host)
    {
        using var anfrage = new HttpRequestMessage(new HttpMethod(methode), new Uri(new Uri(Adresse), pfad));
        if (koerper is not null)
        {
            anfrage.Content = new StringContent(koerper, Encoding.UTF8, "application/json");
        }
        if (host is not null)
        {
            anfrage.Headers.Host = host;
        }
        using var antwort = await client.SendAsync(anfrage);
        var antwortkoerper = await antwort.Content.ReadAsStringAsync();
        return new Kopierantwort(
            antwort.StatusCode,
            ErgebnisAus(antwortkoerper),
            antwort.Headers.Contains("Access-Control-Allow-Origin"),
            antwort.Headers.CacheControl?.NoStore == true);
    }

    private static string ErgebnisAus(string koerper)
    {
        if (koerper.Length == 0)
        {
            return string.Empty;
        }
        try
        {
            using var dokument = JsonDocument.Parse(koerper);
            var hatErgebnis = dokument.RootElement.TryGetProperty("ergebnis", out var wert);
            var istZeichenkette = hatErgebnis && wert.ValueKind == JsonValueKind.String;
            if (!istZeichenkette)
            {
                return string.Empty;
            }
            return wert.GetString()!;
        }
        catch (JsonException)
        {
            return string.Empty;
        }
    }
}

/// <summary>Was der Treiber von einer Antwort behält: Status, Ergebnis-Text, CORS-Kopf, `Cache-Control: no-store`.</summary>
internal sealed record Kopierantwort(HttpStatusCode Status, string Ergebnis, bool HatCorsKopf, bool OhneZwischenspeicher);