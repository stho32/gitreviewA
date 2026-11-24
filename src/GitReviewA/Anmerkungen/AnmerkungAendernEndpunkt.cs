using System.Globalization;
using System.Text.Json;
using GitReviewA.Protokoll;
using GitReviewA.Server;

namespace GitReviewA.Anmerkungen;

/// <summary>
/// Adapter zwischen HTTP und <see cref="AnmerkungAendernInteractor"/>: liest die Nummer aus dem Pfad und `{text}` aus dem Körper und
/// bildet das Ergebnis auf 200, 400, 404 oder 409 ab. Was keine Nummer ist, gibt es nicht (404), wie eine unbekannte Nummer.
/// </summary>
internal static class AnmerkungAendernEndpunkt
{
    private const string Kontext = "Anmerkung";
    private const string Unlesbar = "Körper ist kein JSON-Objekt einer Änderung";
    private const string NichtGefunden = "Anmerkung nicht gefunden";

    public static RequestDelegate Fuer(AnmerkungAendernInteractor interactor, StderrProtokoll protokoll)
    {
        return async kontext =>
        {
            var nummer = NummerAus(kontext.Request);
            if (nummer is null)
            {
                protokoll.Melde(Protokollstufe.Debug, Kontext, $"abgelehnt: {NichtGefunden}");
                await JsonAntwort.SendeMeldungAsync(kontext, StatusCodes.Status404NotFound, NichtGefunden);
                return;
            }
            var lesung = await LiesTextAsync(kontext.Request);
            if (!lesung.IstLesbar)
            {
                protokoll.Melde(Protokollstufe.Debug, Kontext, $"abgelehnt: {Unlesbar}");
                await JsonAntwort.SendeMeldungAsync(kontext, StatusCodes.Status400BadRequest, Unlesbar);
                return;
            }
            var ergebnis = interactor.Aendere(new Aenderungswunsch(nummer.Value, lesung.Text));
            await SendeAsync(kontext, ergebnis);
        };
    }

    private static int? NummerAus(HttpRequest anfrage)
    {
        var roh = anfrage.RouteValues["nummer"] as string;
        var istZahl = int.TryParse(roh, NumberStyles.None, CultureInfo.InvariantCulture, out var nummer);
        if (!istZahl)
        {
            return null;
        }
        return nummer;
    }

    private static async Task<Lesung> LiesTextAsync(HttpRequest anfrage)
    {
        try
        {
            var koerper = await JsonSerializer.DeserializeAsync<Aenderungskoerper>(anfrage.Body, JsonAntwort.Optionen, anfrage.HttpContext.RequestAborted);
            return new Lesung(true, koerper?.Text);
        }
        catch (JsonException)
        {
            return new Lesung(false, null);
        }
    }

    private static Task SendeAsync(HttpContext kontext, Aenderungsergebnis ergebnis)
    {
        switch (ergebnis.Ausgang)
        {
            case Aenderungsausgang.Geaendert:
                var geaenderte = ergebnis.Geaenderte!;
                return JsonAntwort.SendeAsync(kontext, StatusCodes.Status200OK, new AnmerkungGeaendertAntwort(geaenderte.Nummer, geaenderte.Text));
            case Aenderungsausgang.Ungueltig:
                return JsonAntwort.SendeMeldungAsync(kontext, StatusCodes.Status400BadRequest, ergebnis.Grund);
            case Aenderungsausgang.NichtGefunden:
                return JsonAntwort.SendeMeldungAsync(kontext, StatusCodes.Status404NotFound, ergebnis.Grund);
            case Aenderungsausgang.Beendet:
                return JsonAntwort.SendeMeldungAsync(kontext, StatusCodes.Status409Conflict, ergebnis.Grund);
            default:
                throw new InvalidOperationException($"Unbekannter Ausgang {ergebnis.Ausgang}");
        }
    }

    private sealed record Lesung(bool IstLesbar, string? Text);
}