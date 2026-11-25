namespace GitReviewA.Sprung;

/// <summary>
/// Warum eine Stelle keinen VS-Code-Link bekommt (R00021): der Grund steht als Text an der Stelle des Verweises im Diff-Kopf.
/// Dieselben Ursachen-Namen wie die Sperrgründe (R00014); die Texte sind fest und nennen nie einen Namen aus der Anfrage.
/// </summary>
internal static class Sprunggruende
{
    public const string DateiFehlt = "Datei liegt nicht im Arbeitsbaum";
    public const string NameNichtUebergebbar = "Name nicht übergebbar";
    public const string NameNichtEindeutig = "Name nicht eindeutig";
    public const string PfadVerlaesstRepository = "Pfad verlässt das Repository";

    public static string Aus(Sprungablehnung ablehnung)
    {
        switch (ablehnung)
        {
            case Sprungablehnung.StatusGeloescht:
                return DateiFehlt;
            case Sprungablehnung.NameNichtUebergebbar:
                return NameNichtUebergebbar;
            case Sprungablehnung.PfadVerlaesstRepository:
                return PfadVerlaesstRepository;
            default:
                throw new InvalidOperationException($"Ablehnung {ablehnung} hat keinen Grund");
        }
    }
}
