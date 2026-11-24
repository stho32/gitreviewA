namespace GitReviewA.Diff;

/// <summary>
/// Netz gegen den Patch einer anderen Datei: ab dem ersten Abschnitt beginnt jede Zeile mit Vorzeichen, Leerzeichen, `\` oder `@@` —
/// eine Zeile `diff --git ` ist der Kopf einer zweiten Datei, die git mitgeliefert hat. Greift auch dort, wo die Dateiliste nichts zählt (Binärdatei als Text).
/// </summary>
internal static class Patcheinheit
{
    private const string Dateikopf = "diff --git ";

    public static bool ZeigtEineDatei(string patch)
    {
        foreach (var zeile in patch.Split('\n'))
        {
            var istZweiterDateikopf = zeile.StartsWith(Dateikopf, StringComparison.Ordinal);
            if (istZweiterDateikopf)
            {
                return false;
            }
        }
        return true;
    }
}
