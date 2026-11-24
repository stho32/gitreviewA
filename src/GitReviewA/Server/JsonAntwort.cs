using System.Text.Json;

namespace GitReviewA.Server;

internal static class JsonAntwort
{
    public static readonly JsonSerializerOptions Optionen = new(JsonSerializerDefaults.Web) { AllowDuplicateProperties = false };

    public static Task SendeAsync<TInhalt>(HttpContext kontext, int statuscode, TInhalt inhalt)
    {
        kontext.Response.StatusCode = statuscode;
        return kontext.Response.WriteAsJsonAsync(inhalt, Optionen);
    }

    public static Task SendeMeldungAsync(HttpContext kontext, int statuscode, string meldung)
    {
        return SendeAsync(kontext, statuscode, new MeldungAntwort(meldung));
    }
}
