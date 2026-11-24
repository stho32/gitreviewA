using GitReviewA.Anmerkungen;
using GitReviewA.Haken;

namespace GitReviewA.Beenden;

/// <summary>
/// Interaction „Befunde kopieren“ (R00020): liest Anmerkungen und Hakenstand und formatiert das Ergebnis mit demselben Formatierer wie
/// „Beenden“ — genau eine Erzeugungsstelle. Lesend: kein Siegel, kein git, kein stdout.
/// </summary>
internal sealed class ErgebnisKopierenInteractor(Anmerkungsspeicher anmerkungen, DateiAbhakenInteractor dateiAbhaken)
{
    public ErgebnisKopierenAntwort Erzeuge()
    {
        var ergebnis = ErgebnisFormatierer.Formatiere(anmerkungen.Schnappschuss(), dateiAbhaken.Ergebnisstand());
        return new ErgebnisKopierenAntwort(ergebnis);
    }
}