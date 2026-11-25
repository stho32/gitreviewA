namespace GitReviewA.Bild;

/// <summary>Die feste Liste der Seiten: `vorher` oder `nachher`; alles andere ist eine abgewiesene Anfrage.</summary>
internal static class Bildseitenparameter
{
    public const string Name = "seite";
    private const string Vorher = "vorher";
    private const string Nachher = "nachher";

    public static bool Lies(string? wert, out Bildseite seite)
    {
        if (wert == Vorher)
        {
            seite = Bildseite.Vorher;
            return true;
        }
        if (wert == Nachher)
        {
            seite = Bildseite.Nachher;
            return true;
        }
        seite = default;
        return false;
    }
}
