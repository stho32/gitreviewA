using GitReviewA.Git;
using GitReviewA.Protokoll;
using GitReviewA.Server;

namespace GitReviewA.Dateien;

/// <summary>
/// Die Dateiliste eines Commits, gelesen erst auf Anfrage. Nur ein voller Hash aus der Auswahl des Aufrufs erreicht git —
/// alles andere (Revisionsausdrücke, Optionen, Kurzformen, fremde Commits) endet vorher mit 404.
/// </summary>
internal static class DateienEndpunkt
{
    public const string Muster = "/api/commits/{hash}/dateien";
    private const string Anfragekontext = "Anfrage";
    private const string Fehlerkontext = "Dateien";
    private const string Fehlermeldung = "Dateien konnten nicht gelesen werden";

    public static Delegate Fuer(Commitzeilen commits, IDateiquelle quelle, StderrProtokoll protokoll)
    {
        var auswahl = HashesDerAuswahl(commits);
        return (string hash) =>
        {
            var istHashDerAuswahl = auswahl.TryGetValue(hash, out var hashDerAuswahl);
            if (!istHashDerAuswahl || hashDerAuswahl is null)
            {
                return Results.NotFound();
            }
            protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"GET /api/commits/{hashDerAuswahl}/dateien");
            return DateienAntwort(hashDerAuswahl, quelle, protokoll);
        };
    }

    private static Dictionary<string, string> HashesDerAuswahl(Commitzeilen commits)
    {
        var hashNachSchreibweise = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var commit in commits)
        {
            hashNachSchreibweise[commit.Hash] = commit.Hash;
        }
        return hashNachSchreibweise;
    }

    private static IResult DateienAntwort(string hash, IDateiquelle quelle, StderrProtokoll protokoll)
    {
        try
        {
            var dateien = AlsListe(quelle.Lesen(hash));
            return Results.Json(dateien, JsonAntwort.Optionen);
        }
        catch (GitFehler fehler)
        {
            protokoll.Melde(Protokollstufe.Fehler, Fehlerkontext, $"Dateiliste von Commit {hash} nicht lesbar: {fehler.Message}");
            return Results.Json(new MeldungAntwort(Fehlermeldung), JsonAntwort.Optionen, statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    private static List<Dateiaenderung> AlsListe(Dateiaenderungen dateien)
    {
        var liste = new List<Dateiaenderung>(dateien.Anzahl);
        foreach (var datei in dateien)
        {
            liste.Add(datei);
        }
        return liste;
    }
}
