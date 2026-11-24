using System.Net;
using System.Text.Json;
using GitReviewA.Git;
using GitReviewA.Protokoll;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;

namespace GitReviewA.Server;

internal sealed class Webserver : IAsyncDisposable
{
    private const string Startseite = "index.html";
    private const string Anfragekontext = "Anfrage";
    private const string Sicherheitsrichtlinie = "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

    private static readonly JsonSerializerOptions JsonOptionen = new(JsonSerializerDefaults.Web);

    private readonly WebApplication anwendung;

    private Webserver(WebApplication anwendung, int port)
    {
        this.anwendung = anwendung;
        Adresse = $"http://{HostPruefung.Rechneradresse}:{port}/";
    }

    public string Adresse { get; }

    public static async Task<Webserver> StartenAsync(int port, Commitzeilen commits, Oberflaeche oberflaeche, StderrProtokoll protokoll)
    {
        var anwendung = BaueAnwendung(port, protokoll);
        var lauscherPort = new LauscherPort();
        anwendung.Use(SchuetzeVorFremdemHost(lauscherPort, protokoll));
        anwendung.Use(SetzeSchutzkoepfe);
        anwendung.Use(ProtokolliereAnfrage(protokoll));
        BildeEndpunkte(anwendung, commits, oberflaeche);
        await anwendung.StartAsync();
        lauscherPort.Wert = TatsaechlicherPort(anwendung);
        return new Webserver(anwendung, lauscherPort.Wert);
    }

    public Task WartenBisBeendetAsync()
    {
        return anwendung.WaitForShutdownAsync();
    }

    public async ValueTask DisposeAsync()
    {
        await anwendung.StopAsync();
        await anwendung.DisposeAsync();
    }

    private static WebApplication BaueAnwendung(int port, StderrProtokoll protokoll)
    {
        var builder = WebApplication.CreateEmptyBuilder(new WebApplicationOptions { ContentRootPath = AppContext.BaseDirectory });
        builder.WebHost.UseKestrelCore();
        builder.WebHost.ConfigureKestrel(kestrel =>
        {
            kestrel.AddServerHeader = false;
            kestrel.Listen(IPAddress.Loopback, port);
        });
        builder.Services.AddRoutingCore();
        builder.Logging.SetMinimumLevel(LogLevel.Warning);
        builder.Logging.AddProvider(new ProtokollLoggerProvider(protokoll));
        return builder.Build();
    }

    private static Func<HttpContext, RequestDelegate, Task> SchuetzeVorFremdemHost(LauscherPort lauscherPort, StderrProtokoll protokoll)
    {
        return async (kontext, weiter) =>
        {
            var hostIstErlaubt = HostPruefung.IstErlaubt(kontext.Request.Headers.Host.ToString(), lauscherPort.Wert);
            if (!hostIstErlaubt)
            {
                protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"fremder Host abgewiesen (Länge {kontext.Request.Headers.Host.ToString().Length})");
                kontext.Response.StatusCode = StatusCodes.Status400BadRequest;
                return;
            }
            await weiter(kontext);
        };
    }

    private static async Task SetzeSchutzkoepfe(HttpContext kontext, RequestDelegate weiter)
    {
        kontext.Response.Headers.ContentSecurityPolicy = Sicherheitsrichtlinie;
        kontext.Response.Headers.XContentTypeOptions = "nosniff";
        kontext.Response.Headers["Referrer-Policy"] = "no-referrer";
        kontext.Response.Headers.CacheControl = "no-store";
        await weiter(kontext);
    }

    private static Func<HttpContext, RequestDelegate, Task> ProtokolliereAnfrage(StderrProtokoll protokoll)
    {
        return async (kontext, weiter) =>
        {
            await weiter(kontext);
            var muster = (kontext.GetEndpoint() as RouteEndpoint)?.RoutePattern.RawText;
            if (muster is null)
            {
                muster = "ohne Endpunkt";
            }
            protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"{kontext.Request.Method} {muster} -> {kontext.Response.StatusCode}");
        };
    }

    private static void BildeEndpunkte(WebApplication anwendung, Commitzeilen commits, Oberflaeche oberflaeche)
    {
        var commitAntworten = AlsAntworten(commits);
        var zustand = new ZustandAntwort("laeuft", commits.Anzahl);
        anwendung.MapGet("/api/commits", () => Results.Json(commitAntworten, JsonOptionen));
        anwendung.MapGet("/api/zustand", () => Results.Json(zustand, JsonOptionen));
        anwendung.MapGet("/", () => Oberflaechendatei(oberflaeche, Startseite));
        anwendung.MapGet("/{**pfad}", (string pfad) => Oberflaechendatei(oberflaeche, pfad));
    }

    private static List<CommitAntwort> AlsAntworten(Commitzeilen commits)
    {
        var antworten = new List<CommitAntwort>();
        foreach (var commit in commits)
        {
            antworten.Add(new CommitAntwort(commit.Hash, commit.KurzHash, commit.Betreff));
        }
        return antworten;
    }

    private static IResult Oberflaechendatei(Oberflaeche oberflaeche, string pfad)
    {
        var gefunden = oberflaeche.VersucheZuFinden(pfad, out var datei);
        if (!gefunden || datei is null)
        {
            return Results.NotFound();
        }
        return Results.Bytes(datei.Inhalt, datei.Inhaltstyp);
    }

    private static int TatsaechlicherPort(WebApplication anwendung)
    {
        var serverMerkmale = anwendung.Services.GetRequiredService<IServer>().Features;
        var adressen = serverMerkmale.Get<IServerAddressesFeature>();
        if (adressen is null)
        {
            throw new InvalidOperationException("Kestrel nennt keine Adresse");
        }
        return new Uri(adressen.Addresses.Single()).Port;
    }

    private sealed class LauscherPort
    {
        private volatile int wert = -1;

        public int Wert
        {
            get => wert;
            set => wert = value;
        }
    }
}
