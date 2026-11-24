using GitReviewA.Protokoll;

namespace GitReviewA.Server;

/// <summary>Bindet den <see cref="Anfrageschutz"/> an den Endpunkt selbst, nicht an Pfadtexte — Pfadvarianten umgehen ihn nicht.</summary>
internal static class GeschuetzterEndpunkt
{
    private const string Anfragekontext = "Anfrage";

    public static RequestDelegate Mit(RequestDelegate endpunkt, StderrProtokoll protokoll)
    {
        return async kontext =>
        {
            var anfrage = kontext.Request;
            var urteil = Anfrageschutz.Beurteile(anfrage.Method, anfrage.Headers.Origin, anfrage.Headers.ContentType, kontext.Connection.LocalPort);
            if (!urteil.IstZugelassen)
            {
                protokoll.Melde(Protokollstufe.Debug, Anfragekontext, $"abgewiesen: {urteil.Meldung}");
                kontext.Response.Headers.Allow = "POST";
                await JsonAntwort.SendeMeldungAsync(kontext, urteil.Statuscode, urteil.Meldung);
                return;
            }
            await endpunkt(kontext);
        };
    }
}
