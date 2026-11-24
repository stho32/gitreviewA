using System.Text.Json;
using GitReviewA.Protokoll;
using GitReviewA.Server;

namespace GitReviewA.Haken;

/// <summary>
/// Adapter zwischen HTTP und <see cref="DateiAbhakenInteractor"/>. `GET /api/haken` ist nur durch die Host-Prüfung jeder Anfrage geschützt
/// und gibt keine CORS-Freigabe; `POST` steht hinter dem <see cref="GeschuetzterEndpunkt"/> wie das Anlegen einer Anmerkung.
/// </summary>
internal static class HakenEndpunkt
{
    private const string Kontext = "Haken";
    private const string Unlesbar = "Körper ist kein JSON-Objekt eines Hakens";
    private const string NichtLesbar = "Fortschritt konnte nicht gelesen werden";

    public static RequestDelegate Stand(DateiAbhakenInteractor interactor)
    {
        return kontext =>
        {
            var stand = interactor.Stand();
            if (!stand.IstLesbar)
            {
                return JsonAntwort.SendeMeldungAsync(kontext, StatusCodes.Status500InternalServerError, NichtLesbar);
            }
            return JsonAntwort.SendeAsync(kontext, StatusCodes.Status200OK, AlsStandantwort(stand.Dateien));
        };
    }

    public static RequestDelegate Setzen(DateiAbhakenInteractor interactor, StderrProtokoll protokoll)
    {
        return async kontext =>
        {
            var lesung = await LiesHakenanfrageAsync(kontext.Request);
            if (!lesung.IstLesbar)
            {
                protokoll.Melde(Protokollstufe.Debug, Kontext, $"abgelehnt: {Unlesbar}");
                await JsonAntwort.SendeMeldungAsync(kontext, StatusCodes.Status400BadRequest, Unlesbar);
                return;
            }
            var antwort = AlsAntwort(interactor.Setze(lesung.Anfrage));
            await JsonAntwort.SendeAsync(kontext, antwort.Statuscode, antwort.Inhalt);
        };
    }

    public static EndpunktAntwort AlsAntwort(Hakenergebnis ergebnis)
    {
        switch (ergebnis.Ausgang)
        {
            case Hakenausgang.Gesetzt:
                return new EndpunktAntwort(StatusCodes.Status200OK, new HakenGesetztAntwort(ergebnis.Abgehakt, ergebnis.Gesamt));
            case Hakenausgang.Ungueltig:
                return new EndpunktAntwort(StatusCodes.Status400BadRequest, new MeldungAntwort(ergebnis.Grund));
            case Hakenausgang.Beendet:
                return new EndpunktAntwort(StatusCodes.Status409Conflict, new MeldungAntwort(ergebnis.Grund));
            case Hakenausgang.NichtLesbar:
                return new EndpunktAntwort(StatusCodes.Status500InternalServerError, new MeldungAntwort(ergebnis.Grund));
            default:
                throw new InvalidOperationException($"Unbekannter Ausgang {ergebnis.Ausgang}");
        }
    }

    private static HakenstandAntwort AlsStandantwort(Dateienstand dateien)
    {
        var stellen = new List<Stellenstand>(dateien.Gesamt);
        foreach (var stelle in dateien)
        {
            stellen.Add(stelle);
        }
        return new HakenstandAntwort(stellen, dateien.Abgehakt, dateien.Gesamt);
    }

    private static async Task<Lesung> LiesHakenanfrageAsync(HttpRequest anfrage)
    {
        try
        {
            var gelesen = await JsonSerializer.DeserializeAsync<Hakenanfrage>(anfrage.Body, JsonAntwort.Optionen, anfrage.HttpContext.RequestAborted);
            return new Lesung(true, gelesen);
        }
        catch (JsonException)
        {
            return new Lesung(false, null);
        }
    }

    private sealed record Lesung(bool IstLesbar, Hakenanfrage? Anfrage);
}
