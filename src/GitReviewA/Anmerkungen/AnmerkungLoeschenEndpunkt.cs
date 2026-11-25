using System.Globalization;
using GitReviewA.Protokoll;
using GitReviewA.Server;

namespace GitReviewA.Anmerkungen;

/// <summary>
/// Adapter zwischen HTTP und <see cref="AnmerkungLoeschenInteractor"/>: liest die Nummer aus dem Pfad und bildet das Ergebnis auf
/// 200, 404 oder 409 ab. Was keine Nummer ist, gibt es nicht (404), wie eine unbekannte Nummer. Der Körper wird nicht gelesen
/// (leer oder `{}`).
/// </summary>
internal static class AnmerkungLoeschenEndpunkt
{
    private const string Kontext = "Anmerkung";
    private const string NichtGefunden = "Anmerkung nicht gefunden";

    public static RequestDelegate Fuer(AnmerkungLoeschenInteractor interactor, StderrProtokoll protokoll)
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
            var ergebnis = interactor.Loesche(new Loeschungswunsch(nummer.Value));
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

    private static Task SendeAsync(HttpContext kontext, Loeschungsergebnis ergebnis)
    {
        switch (ergebnis.Ausgang)
        {
            case Loeschungsausgang.Geloescht:
                return JsonAntwort.SendeAsync(kontext, StatusCodes.Status200OK, new AnmerkungGeloeschtAntwort(ergebnis.Geloeschte!.Nummer));
            case Loeschungsausgang.NichtGefunden:
                return JsonAntwort.SendeMeldungAsync(kontext, StatusCodes.Status404NotFound, ergebnis.Grund);
            case Loeschungsausgang.Beendet:
                return JsonAntwort.SendeMeldungAsync(kontext, StatusCodes.Status409Conflict, ergebnis.Grund);
            default:
                throw new InvalidOperationException($"Unbekannter Ausgang {ergebnis.Ausgang}");
        }
    }
}
