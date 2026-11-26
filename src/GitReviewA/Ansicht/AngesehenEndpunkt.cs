using System.Text.Json;
using GitReviewA.Haken;
using GitReviewA.Protokoll;
using GitReviewA.Server;

namespace GitReviewA.Ansicht;

/// <summary>
/// Adapter zwischen HTTP und <see cref="AngesehenInteractor"/>: `GET /api/angesehen` liefert den Stand (nur hinter der
/// Host-Prüfung jeder Anfrage, wie `GET /api/haken`), `POST` steht hinter dem <see cref="GeschuetzterEndpunkt"/>. Ein Körper
/// ohne Stellen, mehr als <see cref="AngesehenInteractor.HoechsteStellenJeAnfrage"/> Stellen oder eine Stelle außerhalb der
/// Auswahl antworten 400 und ändern den Stand nicht.
/// </summary>
internal static class AngesehenEndpunkt
{
    public const string Muster = "/api/angesehen";
    private const string Kontext = "Angesehen";
    private const string Unlesbar = "Körper ist kein JSON-Objekt mit Stellen";

    public static RequestDelegate Stand(AngesehenInteractor interactor)
    {
        return kontext =>
        {
            var angesehen = interactor.Angesehen();
            var stellen = new List<AnsichtsstelleAntwort>(angesehen.Count);
            foreach (var stelle in angesehen)
            {
                stellen.Add(new AnsichtsstelleAntwort(stelle.Commit, stelle.Pfad));
            }
            return JsonAntwort.SendeAsync(kontext, StatusCodes.Status200OK, new AnsichtenstandAntwort(stellen, angesehen.Count));
        };
    }

    public static RequestDelegate Markieren(AngesehenInteractor interactor, StderrProtokoll protokoll)
    {
        return async kontext =>
        {
            var anfrage = await LiesAnfrageAsync(kontext.Request);
            if (anfrage is null)
            {
                protokoll.Melde(Protokollstufe.Debug, Kontext, $"abgelehnt: {Unlesbar}");
                await JsonAntwort.SendeMeldungAsync(kontext, StatusCodes.Status400BadRequest, Unlesbar);
                return;
            }
            var antwort = AlsAntwort(interactor.Markiere(anfrage));
            await JsonAntwort.SendeAsync(kontext, antwort.Statuscode, antwort.Inhalt);
        };
    }

    public static EndpunktAntwort AlsAntwort(Angesehenergebnis ergebnis)
    {
        switch (ergebnis.Ausgang)
        {
            case Angesehenausgang.Markiert:
                return new EndpunktAntwort(StatusCodes.Status200OK, new AngesehenAntwort(ergebnis.Anzahl));
            case Angesehenausgang.Ungueltig:
                return new EndpunktAntwort(StatusCodes.Status400BadRequest, new MeldungAntwort(ergebnis.Grund));
            case Angesehenausgang.NichtLesbar:
                return new EndpunktAntwort(StatusCodes.Status500InternalServerError, new MeldungAntwort(ergebnis.Grund));
            default:
                throw new InvalidOperationException($"Unbekannter Ausgang {ergebnis.Ausgang}");
        }
    }

    private static async Task<Ansichtanfrage?> LiesAnfrageAsync(HttpRequest anfrage)
    {
        try
        {
            return await JsonSerializer.DeserializeAsync<Ansichtanfrage>(anfrage.Body, JsonAntwort.Optionen, anfrage.HttpContext.RequestAborted);
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
