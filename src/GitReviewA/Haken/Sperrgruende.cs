using GitReviewA.Diff;

namespace GitReviewA.Haken;

/// <summary>
/// Warum eine Stelle weder Haken noch Anmerkung annimmt: ihr Diff endet am Namen (R00014). Die Texte sind fest und nennen nie den Namen
/// aus der Anfrage; leer heißt lesbar.
/// </summary>
internal static class Sperrgruende
{
    public const string NameNichtEindeutig = "Diff nicht lesbar: Name nicht eindeutig";
    public const string NameNichtUebergebbar = "Diff nicht lesbar: Name nicht übergebbar";

    public static string Aus(Namensfall fall)
    {
        switch (fall)
        {
            case Namensfall.Lesbar:
                return string.Empty;
            case Namensfall.NichtEindeutig:
                return NameNichtEindeutig;
            case Namensfall.NichtUebergebbar:
                return NameNichtUebergebbar;
            default:
                throw new InvalidOperationException($"Namensfall {fall} hat keine Stelle in der Übersicht");
        }
    }
}
