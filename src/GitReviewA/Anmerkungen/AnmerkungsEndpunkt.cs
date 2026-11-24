using System.Text.Json;
using GitReviewA.Protokoll;
using GitReviewA.Server;

namespace GitReviewA.Anmerkungen;

/// <summary>Adapter zwischen HTTP und <see cref="ZeileAnnotierenInteractor"/>: liest den JSON-Körper und bildet das Ergebnis auf 201, 400 oder 409 ab.</summary>
internal static class AnmerkungsEndpunkt
{
    private const string Kontext = "Anmerkung";
    private const string Unlesbar = "Körper ist kein JSON-Objekt einer Anmerkung";

    public static RequestDelegate Fuer(ZeileAnnotierenInteractor interactor, StderrProtokoll protokoll)
    {
        return async kontext =>
        {
            var lesung = await LiesNeueAnmerkungAsync(kontext.Request);
            if (!lesung.IstLesbar)
            {
                protokoll.Melde(Protokollstufe.Debug, Kontext, $"abgelehnt: {Unlesbar}");
                await JsonAntwort.SendeMeldungAsync(kontext, StatusCodes.Status400BadRequest, Unlesbar);
                return;
            }
            var ergebnis = interactor.LegeAn(lesung.Anmerkung);
            await SendeAsync(kontext, ergebnis);
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

    private static Task SendeAsync(HttpContext kontext, AnnotierenErgebnis ergebnis)
    {
        switch (ergebnis.Ausgang)
        {
            case Annotierenausgang.Angelegt:
                return JsonAntwort.SendeAsync(kontext, StatusCodes.Status201Created, new AnmerkungAngelegtAntwort(ergebnis.Angelegt!.Nummer));
            case Annotierenausgang.Ungueltig:
                return JsonAntwort.SendeMeldungAsync(kontext, StatusCodes.Status400BadRequest, ergebnis.Grund);
            case Annotierenausgang.Beendet:
                return JsonAntwort.SendeMeldungAsync(kontext, StatusCodes.Status409Conflict, ergebnis.Grund);
            default:
                throw new InvalidOperationException($"Unbekannter Ausgang {ergebnis.Ausgang}");
        }
    }

    private sealed record Lesung(bool IstLesbar, NeueAnmerkung? Anmerkung);
}
