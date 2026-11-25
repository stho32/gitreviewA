using System.Globalization;
using System.Net;
using System.Text.Json;
using GitReviewA.Anmerkungen;
using GitReviewA.Aufruf;
using GitReviewA.Beenden;
using GitReviewA.Dateien;
using GitReviewA.Diff;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Protokoll;
using GitReviewA.Sprung;
using GitReviewA.Zusammen;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;

namespace GitReviewA.Server;

internal sealed class Webserver : IAsyncDisposable
{
    private const string Startseite = "index.html";
    private const string Anfragekontext = "Anfrage";
    private const string Apisegment = "/api";
    private const string Sicherheitsrichtlinie = "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

    private static readonly JsonSerializerOptions JsonOptionen = new(JsonSerializerDefaults.Web);

    private static readonly TimeSpan HoechsteWartezeitAufOffeneAnfragen = TimeSpan.FromSeconds(2);

    private readonly WebApplication anwendung;

    private Webserver(WebApplication anwendung, int port, Anmerkungsspeicher anmerkungen, DateiAbhakenInteractor dateiAbhaken, ErgebnisKopierenInteractor ergebnis)
    {
        this.anwendung = anwendung;
        Adresse = $"http://{HostPruefung.Rechneradresse}:{port}/";
        Anmerkungen = anmerkungen;
        DateiAbhaken = dateiAbhaken;
        Ergebnis = ergebnis;
    }

    public string Adresse { get; }

    public Anmerkungsspeicher Anmerkungen { get; }

    public DateiAbhakenInteractor DateiAbhaken { get; }

    /// <summary>Die eine Erzeugungsstelle des Ergebnisses (R00002/R00020/R00031); auch der Hauptablauf schreibt sie auf stdout.</summary>
    public ErgebnisKopierenInteractor Ergebnis { get; }

    public static async Task<Webserver> StartenAsync(int port, Commitzeilen commits, IDateiquelle dateiquelle, IDiffquelle diffquelle, IUebersichtsquelle uebersichtsquelle, IZusammenquelle zusammenquelle, Oberflaeche oberflaeche, StderrProtokoll protokoll, ISprungquelle? sprungquelle = null, Musterliste? muster = null, Bild.IBildquelle? bildquelle = null, string? arbeitsordner = null)
    {
        var anwendung = BaueAnwendung(port, protokoll);
        var anmerkungen = new Anmerkungsspeicher();
        var haken = new Hakenspeicher();
        var uebersicht = new GemerkteUebersicht(uebersichtsquelle);
        var zusammen = new ZusammenLesenInteractor(commits, uebersicht, zusammenquelle, diffquelle, protokoll);
        var dateiAbhaken = new DateiAbhakenInteractor(uebersicht, haken, zusammen, protokoll);
        var lauscherPort = new LauscherPort();
        anwendung.Use(SchuetzeVorFremdemHost(lauscherPort, protokoll));
        anwendung.Use(SetzeSchutzkoepfe);
        anwendung.Use(SchuetzeLeseanfragen(protokoll));
        anwendung.Use(ProtokolliereAnfrage(protokoll));
        BildeEndpunkte(anwendung, commits, oberflaeche, muster);
        MeldeMuster(protokoll, muster);
        var dateien = new GemerkteDateiquelle(dateiquelle);
        anwendung.MapGet(DateienEndpunkt.Muster, DateienEndpunkt.Fuer(commits, dateien, protokoll));
        anwendung.MapGet(DiffEndpunkt.Muster, DiffEndpunkt.Fuer(new DiffLesenInteractor(commits, dateien, diffquelle, protokoll)));
        if (bildquelle is not null)
        {
            anwendung.MapGet(Bild.BildEndpunkt.Muster, Bild.BildEndpunkt.Fuer(new Bild.BildLesenInteractor(commits, dateien, bildquelle, protokoll)));
        }
        anwendung.MapGet(ZusammenEndpunkt.Listenmuster, ZusammenEndpunkt.Liste(zusammen));
        anwendung.MapGet(ZusammenEndpunkt.Diffmuster, ZusammenEndpunkt.Diff(zusammen));
        if (sprungquelle is not null)
        {
            anwendung.MapGet(SprungEndpunkt.Muster, SprungEndpunkt.Fuer(new SprungInteractor(commits, dateien, sprungquelle, protokoll)));
        }
        var ergebnis = BildeRueckkanal(anwendung, commits, anmerkungen, haken, dateiAbhaken, uebersicht, arbeitsordner, protokoll);
        await anwendung.StartAsync();
        lauscherPort.Wert = TatsaechlicherPort(anwendung);
        return new Webserver(anwendung, lauscherPort.Wert, anmerkungen, dateiAbhaken, ergebnis);
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
        builder.Services.Configure<HostOptions>(optionen => optionen.ShutdownTimeout = HoechsteWartezeitAufOffeneAnfragen);
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
            var betrifftApi = anfrage.Path.StartsWithSegments(Apisegment, StringComparison.OrdinalIgnoreCase);
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

    private static void BildeEndpunkte(WebApplication anwendung, Commitzeilen commits, Oberflaeche oberflaeche, Musterliste? muster)
    {
        var commitAntworten = AlsAntworten(commits);
        var zustand = new ZustandAntwort("laeuft", commits.Anzahl, Mustertexte(muster));
        anwendung.MapGet("/api/commits", () => Results.Json(commitAntworten, JsonOptionen));
        anwendung.MapGet("/api/zustand", () => Results.Json(zustand, JsonOptionen));
        anwendung.MapGet("/", () => Oberflaechendatei(oberflaeche, Startseite));
        anwendung.MapGet("/{**pfad}", (string pfad) => Oberflaechendatei(oberflaeche, pfad));
    }

    private static string[] Mustertexte(Musterliste? muster)
    {
        if (muster is null)
        {
            return [];
        }
        var texte = new string[muster.Anzahl];
        for (var i = 0; i < muster.Anzahl; i++)
        {
            texte[i] = muster[i];
        }
        return texte;
    }

    /** Die Zahl der Muster und ihre Längen, nie der Wortlaut (R00025). */
    private static void MeldeMuster(StderrProtokoll protokoll, Musterliste? muster)
    {
        if (muster is null || muster.Anzahl == 0)
        {
            return;
        }
        var laengen = new string[muster.Anzahl];
        for (var i = 0; i < muster.Anzahl; i++)
        {
            laengen[i] = muster[i].Length.ToString(CultureInfo.InvariantCulture);
        }
        protokoll.Melde(Protokollstufe.Debug, "Ausblenden", $"{muster.Anzahl} Muster (Längen: {string.Join(", ", laengen)})");
    }

    /// <summary>Baut den Rückkanal und liefert die eine Erzeugungsstelle des Ergebnisses (der Hauptablauf nutzt sie für stdout).</summary>
    private static ErgebnisKopierenInteractor BildeRueckkanal(WebApplication anwendung, Commitzeilen commits, Anmerkungsspeicher anmerkungen, Hakenspeicher haken, DateiAbhakenInteractor dateiAbhaken, GemerkteUebersicht uebersicht, string? arbeitsordner, StderrProtokoll protokoll)
    {
        var sperre = new Stellensperre(uebersicht, protokoll);
        var interactor = new ZeileAnnotierenInteractor(anmerkungen, new CommitAuswahl(commits), sperre, protokoll);
        var anlegen = AnmerkungsEndpunkt.Fuer(interactor, protokoll);
        var aendern = AnmerkungAendernEndpunkt.Fuer(new AnmerkungAendernInteractor(anmerkungen, sperre, protokoll), protokoll);
        var loeschen = AnmerkungLoeschenEndpunkt.Fuer(new AnmerkungLoeschenInteractor(anmerkungen, protokoll), protokoll);
        anwendung.MapGet("/api/anmerkungen", AnmerkungenListeEndpunkt.Fuer(interactor));
        anwendung.Map("/api/anmerkungen", GeschuetzterEndpunkt.Mit(anlegen, protokoll));
        anwendung.Map("/api/anmerkungen/{nummer}", GeschuetzterEndpunkt.Mit(aendern, protokoll));
        anwendung.Map("/api/anmerkungen/{nummer}/loeschen", GeschuetzterEndpunkt.Mit(loeschen, protokoll));
        anwendung.MapGet("/api/haken", HakenEndpunkt.Stand(dateiAbhaken));
        anwendung.Map("/api/haken", GeschuetzterEndpunkt.Mit(HakenEndpunkt.Setzen(dateiAbhaken, protokoll), protokoll));
        var beenden = BeendenEndpunkt.Fuer(anmerkungen, haken, anwendung.Lifetime, protokoll);
        anwendung.Map("/api/beenden", GeschuetzterEndpunkt.Mit(beenden, protokoll));
        var bereichszeilen = arbeitsordner is null ? null : new Bereichszeilen(uebersicht, arbeitsordner, Ausgabegrenze.Standard, protokoll);
        var ergebnis = new ErgebnisKopierenInteractor(anmerkungen, dateiAbhaken, bereichszeilen);
        anwendung.MapGet("/api/ergebnis", ErgebnisKopierenEndpunkt.Fuer(ergebnis, protokoll));
        return ergebnis;
    }

    private static List<CommitAntwort> AlsAntworten(Commitzeilen commits)
    {
        var antworten = new List<CommitAntwort>();
        foreach (var commit in commits)
        {
            antworten.Add(new CommitAntwort(commit.Hash, commit.KurzHash, commit.Autor, commit.Datum, commit.Betreff, commit.Rumpf));
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
