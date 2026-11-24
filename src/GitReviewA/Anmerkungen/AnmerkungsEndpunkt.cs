using System.Text.Json;
using GitReviewA.Protokoll;
using GitReviewA.Server;

namespace GitReviewA.Anmerkungen;

internal static class AnmerkungsEndpunkt
{
    private const string Kontext = "Anmerkung";

    public static RequestDelegate Fuer(Anmerkungsspeicher speicher, CommitAuswahl auswahl, StderrProtokoll protokoll)
    {
        return async kontext =>
        {
            var lesung = await LiesNeueAnmerkungAsync(kontext.Request);
            if (!lesung.IstLesbar)
            {
                await LehneAbAsync(kontext, protokoll, "Körper ist kein JSON-Objekt einer Anmerkung");
                return;
            }
            var pruefung = AnmerkungsPruefer.Pruefe(lesung.Anmerkung, auswahl);
            if (!pruefung.IstGueltig)
            {
                await LehneAbAsync(kontext, protokoll, pruefung.Ablehnungsgrund);
                return;
            }
            if (!speicher.VersucheAnzuhaengen(pruefung.Anmerkung, out var angelegt))
            {
                await JsonAntwort.SendeMeldungAsync(kontext, StatusCodes.Status409Conflict, "Review ist beendet — keine Anmerkung mehr möglich");
                return;
            }
            protokoll.Melde(Protokollstufe.Debug, Kontext, $"Nummer {angelegt.Nummer} angelegt (Textlänge {angelegt.Text.Length})");
            await JsonAntwort.SendeAsync(kontext, StatusCodes.Status201Created, new AnmerkungAngelegtAntwort(angelegt.Nummer));
        };
    }

    private static async Task<Lesung> LiesNeueAnmerkungAsync(HttpRequest anfrage)
    {
        try
        {
            var neu = await JsonSerializer.DeserializeAsync<NeueAnmerkung>(anfrage.Body, JsonAntwort.Optionen, anfrage.HttpContext.RequestAborted);
            return new Lesung(true, neu);
        }
        catch (JsonException)
        {
            return new Lesung(false, null);
        }
    }

    private static Task LehneAbAsync(HttpContext kontext, StderrProtokoll protokoll, string grund)
    {
        protokoll.Melde(Protokollstufe.Debug, Kontext, $"abgelehnt: {grund}");
        return JsonAntwort.SendeMeldungAsync(kontext, StatusCodes.Status400BadRequest, grund);
    }

    private sealed record Lesung(bool IstLesbar, NeueAnmerkung? Anmerkung);
}
