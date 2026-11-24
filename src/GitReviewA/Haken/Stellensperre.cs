using GitReviewA.Git;
using GitReviewA.Protokoll;

namespace GitReviewA.Haken;

/// <summary>
/// Beantwortet für eine Anmerkung, ob ihre Stelle gesperrt ist — aus derselben gemerkten Übersicht wie der Haken, ohne zweite Lesung.
/// Lässt sich die Übersicht nicht lesen, sperrt sie nicht: das Anmerken hängt nicht an ihr (Entscheidung des product-owner, R00014).
/// </summary>
internal sealed class Stellensperre(GemerkteUebersicht uebersicht, StderrProtokoll protokoll)
{
    private const string Kontext = "Anmerkung";

    /// <summary>Leer, wenn die Stelle lesbar ist, die Übersicht sie nicht kennt oder die Übersicht nicht lesbar ist.</summary>
    public string SperrgrundVon(string commit, string datei)
    {
        Dateiuebersicht gelesen;
        try
        {
            gelesen = uebersicht.Lesen();
        }
        catch (GitFehler fehler)
        {
            protokoll.Melde(Protokollstufe.Fehler, Kontext, $"Übersicht der Dateien nicht lesbar, Anmerkung ohne Sperrprüfung: {fehler.Message}");
            return string.Empty;
        }
        return gelesen.SperrgrundVon(new Stelle(commit, datei));
    }
}
