using System.Globalization;
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
namespace GitReviewA.Server;

internal sealed class Webserver : IAsyncDisposable
{
    private const string Startseite = "index.html";
    private static readonly JsonSerializerOptions JsonOptionen = new(JsonSerializerDefaults.Web);

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
        var lauscherPort = new Serverbau.LauscherPort();
        var anwendung = Serverbau.Baue(port, protokoll, lauscherPort);
        var anmerkungen = new Anmerkungsspeicher();
        var haken = new Hakenspeicher();
        var uebersicht = new GemerkteUebersicht(uebersichtsquelle);
        var zusammen = new ZusammenLesenInteractor(commits, uebersicht, zusammenquelle, diffquelle, protokoll);
        var dateiAbhaken = new DateiAbhakenInteractor(uebersicht, haken, zusammen, protokoll);
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
        lauscherPort.Wert = Serverbau.TatsaechlicherPort(anwendung);
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

    private static void BildeEndpunkte(WebApplication anwendung, Commitzeilen commits, Oberflaeche oberflaeche, Musterliste? muster)
    {
        var commitAntworten = AlsAntworten(commits);
        var zustand = new ZustandAntwort("laeuft", commits.Anzahl, Mustertexte(muster));
        anwendung.MapGet("/api/commits", () => Results.Json(commitAntworten, JsonOptionen));
        anwendung.MapGet("/api/zustand", () => Results.Json(zustand, JsonOptionen));
        Serverbau.BaueOberflaechenrouten(anwendung, oberflaeche, Startseite);
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
}
