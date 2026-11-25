using System.Globalization;
using GitReviewA.Server;
using Microsoft.Extensions.Primitives;

namespace GitReviewA.Dateiansicht;

/// <summary>
/// Die Endpunkte der Dateiansicht (R00043, B4205): die Liste und der Text nur über eine Nummer aus dem Stand beim Start, nie über
/// einen Pfad; „Schließen“ als POST. Die Nummer ist nur ASCII-Ziffern im Bereich der Liste — jede andere Schreibweise endet mit 404.
/// Review-Endpunkte sind in dieser Laufart gar nicht erst registriert.
/// </summary>
internal static class DateiansichtEndpunkt
{
    public const string Listenmuster = "/api/dateiansicht";
    public const string Textmuster = "/api/dateiansicht/{nummer}";
    public const string Schliessenmuster = "/api/schliessen";

    private const string Nummerwert = "nummer";

    public static RequestDelegate Liste(Dateiansichtsstand stand)
    {
        return async kontext =>
        {
            var antworten = new List<DateieintragAntwort>(stand.Anzahl);
            for (var nummer = 0; nummer < stand.Anzahl; nummer++)
            {
                antworten.Add(AlsAntwort(stand[nummer]));
            }
            await JsonAntwort.SendeAsync(kontext, StatusCodes.Status200OK, new DateiansichtlisteAntwort(antworten));
        };
    }

    public static RequestDelegate Text(Dateiansichtsstand stand)
    {
        return async kontext =>
        {
            var nummerntext = AlsText(kontext.Request.RouteValues[Nummerwert]);
            var eintrag = FuehrtZumInhalt(kontext.Request.Path, nummerntext, stand);
            if (eintrag is null)
            {
                kontext.Response.StatusCode = StatusCodes.Status404NotFound;
                return;
            }
            await JsonAntwort.SendeAsync(kontext, StatusCodes.Status200OK, new DateitextAntwort(eintrag.Text.Text, eintrag.GekuerzteZeilen));
        };
    }

    public static RequestDelegate Schliessen(Dateiansichtlaufzustand zustand, IHostApplicationLifetime lebensdauer, Protokoll.StderrProtokoll protokoll)
    {
        return async kontext =>
        {
            zustand.IstGeschlossen = true;
            await JsonAntwort.SendeAsync(kontext, StatusCodes.Status200OK, new SchliessenAntwort("Dateiansicht geschlossen"));
            protokoll.Melde(Protokoll.Protokollstufe.Debug, "Dateiansicht", "Dateiansicht geschlossen");
            lebensdauer.StopApplication();
        };
    }

    /// <summary>
    /// Der Pfad muss genau die eine Schreibweise sein: <c>/api/dateiansicht/&lt;ASCII-Ziffern&gt;</c> — ein Schrägstrich am Ende,
    /// ein weiteres Segment oder eine Unicode-Ziffer führt nirgends hin. <c>/%30</c> ist nach dem Dekodieren gleichwertig zu <c>/0</c>.
    /// </summary>
    private static Dateieintrag? FuehrtZumInhalt(PathString pfad, string? nummerntext, Dateiansichtsstand stand)
    {
        if (nummerntext is null || pfad.Value != $"{Textmuster.Replace("{nummer}", string.Empty, StringComparison.Ordinal)}{nummerntext}")
        {
            return null;
        }
        var istZahl = int.TryParse(nummerntext, NumberStyles.None, CultureInfo.InvariantCulture, out var nummer);
        var istKanonisch = istZahl && nummerntext == nummer.ToString(CultureInfo.InvariantCulture);
        if (!istKanonisch)
        {
            return null;
        }
        return stand.Datei(nummer);
    }

    private static string? AlsText(object? wert)
    {
        return wert switch
        {
            string text => text,
            StringValues werte when werte.Count == 1 => werte[0],
            _ => null,
        };
    }

    private static DateieintragAntwort AlsAntwort(Dateieintrag eintrag)
    {
        return new DateieintragAntwort(
            eintrag.Nummer,
            eintrag.Anzeigename,
            eintrag.EchterPfad,
            eintrag.Text.Groesse,
            eintrag.Text.Zeilen,
            eintrag.Text.Kodierungstext,
            eintrag.Text.Zeilenendetext,
            eintrag.GekuerzteZeilen);
    }
}
