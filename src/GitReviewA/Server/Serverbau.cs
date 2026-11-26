using System.Net;
using GitReviewA.Protokoll;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;

namespace GitReviewA.Server;

/// <summary>
/// Der gemeinsame Bau beider Laufarten (Review und Dateiansicht): Kestrel nur auf <c>127.0.0.1</c>, Host-Prüfung, Schutzkoepfe,
/// Abwehr fremder Herkunft auf lesenden <c>/api/</c>-Anfragen und die Debug-Zeile je Anfrage — eine Stelle, kein zweiter Server.
/// </summary>
internal static class Serverbau
{
    public const string Anfragekontext = "Anfrage";
    private const string Sicherheitsrichtlinie = "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

    private static readonly TimeSpan HoechsteWartezeitAufOffeneAnfragen = TimeSpan.FromSeconds(2);

    public static WebApplication Baue(int port, StderrProtokoll protokoll, LauscherPort lauscherPort)
    {
        var builder = WebApplication.CreateEmptyBuilder(new WebApplicationOptions { ContentRootPath = AppContext.BaseDirectory });
        builder.WebHost.UseKestrelCore();
        builder.WebHost.ConfigureKestrel(kestrel =>
        {
            kestrel.AddServerHeader = false;
            kestrel.Listen(IPAddress.Loopback, port);
        });
        builder.Services.AddRoutingCore();
        builder.Services.Configure<HostOptions>(optionen => optionen.ShutdownTimeout = HoechsteWartezeitAufOffeneAnfragen);
        builder.Logging.SetMinimumLevel(LogLevel.Warning);
        // Den Startfehler meldet das Programm selbst in genau einer Zeile `FEHLER [Server] …` (R00043, X7); der Host wiederholte ihn.
        builder.Logging.AddFilter("Microsoft.Extensions.Hosting", LogLevel.None);
        builder.Logging.AddProvider(new ProtokollLoggerProvider(protokoll));
        var anwendung = builder.Build();
        anwendung.Use(SchuetzeVorFremdemHost(lauscherPort, protokoll));
        anwendung.Use(SetzeSchutzkoepfe);
        anwendung.Use(SchuetzeLeseanfragen(protokoll));
        anwendung.Use(ProtokolliereAnfrage(protokoll));
        return anwendung;
    }

    /// <summary>Eine eingebettete Datei der Oberfläche oder 404 — eine Stelle für beide Laufarten.</summary>
    public static IResult Oberflaechendatei(Oberflaeche oberflaeche, string pfad)
    {
        var gefunden = oberflaeche.VersucheZuFinden(pfad, out var datei);
        if (!gefunden || datei is null)
        {
            return Results.NotFound();
        }
        return Results.Bytes(datei.Inhalt, datei.Inhaltstyp);
    }

    /// <summary>
    /// Die Startseite und jede weitere eingebettete Datei — eine Stelle für beide Laufarten. Je Datei eine eigene Route statt
    /// eines Sammelpfads: ein Sammelpfad kennt den Pfad <c>/api/…</c> und antwortet auf eine fremde Methode mit 405; die
    /// Laufart-Trennung verlangt, dass die Endpunkte der anderen Laufart gar nicht erst existieren (R00043, Kriterium 10; H3).
    /// </summary>
    public static void BaueOberflaechenrouten(WebApplication anwendung, Oberflaeche oberflaeche, string startseite)
    {
        anwendung.MapGet("/", () => Oberflaechendatei(oberflaeche, startseite));
        foreach (var pfad in oberflaeche.Pfade)
        {
            anwendung.MapGet($"/{pfad}", () => Oberflaechendatei(oberflaeche, pfad));
        }
    }

    public static int TatsaechlicherPort(WebApplication anwendung)
    {
        var serverMerkmale = anwendung.Services.GetRequiredService<IServer>().Features;
        var adressen = serverMerkmale.Get<IServerAddressesFeature>();
        if (adressen is null)
        {
            throw new InvalidOperationException("Kestrel nennt keine Adresse");
        }
        return new Uri(adressen.Addresses.Single()).Port;
    }

    private static Func<HttpContext, RequestDelegate, Task> SchuetzeVorFremdemHost(LauscherPort lauscherPort, StderrProtokoll protokoll)
    {
        return async (kontext, weiter) =>
        {
            var hostIstErlaubt = HostPruefung.IstErlaubt(kontext.Request.Headers.Host.ToString(), lauscherPort.Wert);
            if (!hostIstErlaubt)
            {
                protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"fremder Host abgewiesen (Länge {kontext.Request.Headers.Host.ToString().Length})");
                kontext.Response.StatusCode = StatusCodes.Status403Forbidden;
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

    /// <summary>
    /// Eine Stelle für alle lesenden <c>/api/</c>-Endpunkte (Befundkarte #55): fremde Herkunft wird abgewiesen, bevor
    /// die Routenauswahl den Endpunkt ausführt. Geprüft wird der Kestrel-normalisierte Pfad, den auch die Auswahl
    /// benutzt — Schreibweise, abschließender Schrägstrich und Punktsegmente ändern daran nichts.
    /// </summary>
    private static Func<HttpContext, RequestDelegate, Task> SchuetzeLeseanfragen(StderrProtokoll protokoll)
    {
        return async (kontext, weiter) =>
        {
            var anfrage = kontext.Request;
            var betrifftApi = anfrage.Path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase);
            var istLeseanfrage = HttpMethods.IsGet(anfrage.Method);
            var kommtVonFremd = FremdeHerkunft.IstFremd(anfrage.Headers.Origin, anfrage.Headers[FremdeHerkunft.Querherkunftskopf], kontext.Connection.LocalPort);
            if (betrifftApi && istLeseanfrage && kommtVonFremd)
            {
                protokoll.Melde(Protokollstufe.Debug, Anfragekontext, FremdeHerkunft.Meldung);
                await JsonAntwort.SendeMeldungAsync(kontext, StatusCodes.Status403Forbidden, FremdeHerkunft.Meldung);
                return;
            }
            await weiter(kontext);
        };
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

    internal sealed class LauscherPort
    {
        private volatile int wert = -1;

        public int Wert
        {
            get => wert;
            set => wert = value;
        }
    }
}