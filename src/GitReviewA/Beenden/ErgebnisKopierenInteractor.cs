using GitReviewA.Anmerkungen;
using GitReviewA.Haken;

namespace GitReviewA.Beenden;

/// <summary>
/// Interaction „Befunde kopieren“ (R00020): liest Anmerkungen und Hakenstand und formatiert das Ergebnis mit demselben Formatierer wie
/// „Beenden“ — genau eine Erzeugungsstelle. Lesend: kein Siegel, kein git, kein stdout. Für Bereichsanmerkungen liest sie die
/// markierten Zeilen je (Commit, Datei) höchstens einmal (R00031) und gibt sie dem Formatierer als Zitat mit; ohne Lesepfad
/// bleibt der Abschnitt bei Stelle und Text.
/// </summary>
internal sealed class ErgebnisKopierenInteractor(Anmerkungsspeicher anmerkungen, DateiAbhakenInteractor dateiAbhaken, Bereichszeilen? bereichszeilen = null)
{
    public ErgebnisKopierenAntwort Erzeuge()
    {
        var stand = anmerkungen.Schnappschuss();
        var ergebnis = ErgebnisFormatierer.Formatiere(stand, dateiAbhaken.Ergebnisstand(), LiesZitate(stand));
        return new ErgebnisKopierenAntwort(ergebnis);
    }

    /// <summary>Die Zeilen der Bereiche, je stabiler Nummer; je (Commit, Datei) ein Lesevorgang, den alle Bereiche dieser Stelle teilen.</summary>
    private IReadOnlyDictionary<int, Bereichszeilenlesung> LiesZitate(Anmerkungsliste stand)
    {
        var zitate = new Dictionary<int, Bereichszeilenlesung>();
        if (bereichszeilen is null)
        {
            return zitate;
        }
        var gelesen = new Dictionary<(string Commit, string Datei), Bereichsdateilesung>();
        foreach (var anmerkung in stand)
        {
            if (anmerkung.Von is not { } von || anmerkung.Bis is not { } bis)
            {
                continue;
            }
            var schluessel = (anmerkung.Commit, anmerkung.Datei);
            if (!gelesen.TryGetValue(schluessel, out var dateiinhalt))
            {
                dateiinhalt = bereichszeilen.LiesDatei(anmerkung.Commit, anmerkung.Datei);
                gelesen[schluessel] = dateiinhalt;
            }
            zitate[anmerkung.Nummer] = bereichszeilen.BereichAus(anmerkung.Commit, anmerkung.Datei, dateiinhalt, von, bis);
        }
        return zitate;
    }
}
