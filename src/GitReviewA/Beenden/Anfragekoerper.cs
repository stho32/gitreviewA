namespace GitReviewA.Beenden;

/// <summary>
/// Der Körper einer zustandsändernden Anfrage muss bis zum Ende ankommen, sonst ist die Anforderung keine: eine halb
/// gesendete Anfrage darf weder „Beenden“ noch den Abbruch auslösen (R00002/R00050). Eine Stelle für beide Endpunkte.
/// </summary>
internal static class Anfragekoerper
{
    public static async Task<bool> LiesBisZumEndeAsync(HttpContext kontext)
    {
        try
        {
            await kontext.Request.Body.CopyToAsync(Stream.Null, kontext.RequestAborted);
            return true;
        }
        catch (IOException)
        {
            return false;
        }
        catch (OperationCanceledException)
        {
            return false;
        }
    }
}