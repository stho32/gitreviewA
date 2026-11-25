using System.Diagnostics;
using System.Net.Http;
using System.Text;
using System.Text.RegularExpressions;
using GitReviewA.Aufruf;

namespace GitReviewA.Tests.Hilfen;

/// <summary>
/// Startet gitreviewA als echten Prozess (R00043 Kriterien 1–3, Ebene „Programm als Prozess“): sammelt stdout und stderr getrennt,
/// kennt die Startzeile und kann „Schließen“ oder ein Signal senden. Die Startzeile allein beweist „kein Server“ bei Exit 2.
/// </summary>
internal sealed class Dateiansichtprozess : IDisposable
{
    private static readonly Regex Startzeile = new(@"http://127\.0\.0\.1:(\d+)/", RegexOptions.CultureInvariant);

    private readonly Process prozess;
    private readonly StringBuilder ausgabe = new();
    private readonly StringBuilder fehler = new();
    private readonly Task ausLesen;
    private readonly Task fehlerLesen;
    private Task<int>? ende;

    private Dateiansichtprozess(Process prozess)
    {
        this.prozess = prozess;
        ausLesen = Lesen(prozess.StandardOutput, ausgabe);
        fehlerLesen = Lesen(prozess.StandardError, fehler);
    }

    public int Prozessnummer => prozess.Id;

    public string Ausgabe
    {
        get
        {
            lock (ausgabe)
            {
                return ausgabe.ToString();
            }
        }
    }

    public string Fehler
    {
        get
        {
            lock (fehler)
            {
                return fehler.ToString();
            }
        }
    }

    public string? Adresse { get; private set; }

    public int Port => Adresse is null ? 0 : new Uri(Adresse).Port;

    public static async Task<Dateiansichtprozess> StarteAsync(string ordner, params string[] argumente)
    {
        var start = new ProcessStartInfo("dotnet")
        {
            WorkingDirectory = ordner,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
        };
        start.ArgumentList.Add(typeof(Aufrufleser).Assembly.Location);
        foreach (var argument in argumente)
        {
            start.ArgumentList.Add(argument);
        }
        var prozess = Process.Start(start) ?? throw new InvalidOperationException("Prozess startet nicht");
        var lauf = new Dateiansichtprozess(prozess);
        await lauf.WarteAufStartzeileAsync();
        return lauf;
    }

    /// <summary>Wartet auf die Startzeile; endet der Prozess vorher, ist das kein Fehler für Aufrufe, die mit Exit 2 enden sollen.</summary>
    private async Task WarteAufStartzeileAsync()
    {
        var frist = Stopwatch.StartNew();
        while (frist.Elapsed < TimeSpan.FromSeconds(30))
        {
            var treffer = Startzeile.Match(fehler.ToString());
            if (treffer.Success)
            {
                Adresse = treffer.Value;
                return;
            }
            if (prozess.HasExited)
            {
                return;
            }
            await Task.Delay(20);
        }
    }

    public async Task<int> WarteAufEndeAsync()
    {
        ende ??= WarteAufEndeInternAsync();
        return await ende;
    }

    private async Task<int> WarteAufEndeInternAsync()
    {
        using var frist = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        try
        {
            await prozess.WaitForExitAsync(frist.Token);
        }
        catch (OperationCanceledException)
        {
            prozess.Kill(entireProcessTree: true);
            throw new TimeoutException($"gitreviewA endet nicht; stderr: {Fehler}");
        }
        await BeendeLeser(ausLesen);
        await BeendeLeser(fehlerLesen);
        return prozess.ExitCode;
    }

    public async Task<(int Status, string Koerper)> SchliessenAsync()
    {
        using var client = new HttpClient();
        using var inhalt = new StringContent("{}", Encoding.UTF8, "application/json");
        using var antwort = await client.PostAsync(new Uri(new Uri(Adresse!), "api/schliessen"), inhalt);
        return ((int)antwort.StatusCode, await antwort.Content.ReadAsStringAsync());
    }

    public async Task<(int Status, string Koerper)> AbrufenAsync(string pfad)
    {
        using var client = new HttpClient();
        var antwort = await client.GetAsync(new Uri(new Uri(Adresse!), pfad));
        return ((int)antwort.StatusCode, await antwort.Content.ReadAsStringAsync());
    }

    public async Task SendeSigtermAsync()
    {
        using var kill = Process.Start("kill", ["-TERM", prozess.Id.ToString(System.Globalization.CultureInfo.InvariantCulture)]);
        if (kill is not null)
        {
            await kill.WaitForExitAsync();
        }
    }

    public void Dispose()
    {
        if (!prozess.HasExited)
        {
            prozess.Kill(entireProcessTree: true);
            prozess.WaitForExit(5000);
        }
        prozess.Dispose();
    }

    private static async Task BeendeLeser(Task leser)
    {
        try
        {
            await leser;
        }
        catch (IOException)
        {
            // Das Rohr schließt mit dem Prozess; was gelesen wurde, steht schon im Puffer.
        }
        catch (ObjectDisposedException)
        {
            // Der Prozess ist schon freigegeben.
        }
    }

    private static async Task Lesen(StreamReader strom, StringBuilder ziel)
    {
        var puffer = new char[4096];
        int gelesen;
        while (true)
        {
            try
            {
                gelesen = await strom.ReadAsync(puffer);
            }
            catch (IOException)
            {
                return;
            }
            catch (ObjectDisposedException)
            {
                return;
            }
            if (gelesen <= 0)
            {
                return;
            }
            lock (ziel)
            {
                ziel.Append(puffer, 0, gelesen);
            }
        }
    }
}