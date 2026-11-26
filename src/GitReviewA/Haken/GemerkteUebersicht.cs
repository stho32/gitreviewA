using GitReviewA.Git;
using GitReviewA.Protokoll;

namespace GitReviewA.Haken;

/// <summary>
/// Liest die Übersicht beim ersten Zugriff einmal und hält sie für den Lauf (Commits sind unveränderlich). Ein Fehler wird nicht gemerkt:
/// der nächste Zugriff — etwa nach dem Neuladen der Seite — liest erneut. Nur das Lesen steht unter der Sperre; das Ergebnis wartet nie auf git.
/// </summary>
internal sealed class GemerkteUebersicht(IUebersichtsquelle quelle)
{
    private readonly Lock sperre = new();
    private Dateiuebersicht? gemerkt;

    public Dateiuebersicht Lesen()
    {
        lock (sperre)
        {
            if (gemerkt is null)
            {
                Volatile.Write(ref gemerkt, quelle.Lesen());
            }
            return gemerkt;
        }
    }

    /// <summary>
    /// Für das Ergebnis: liest nie selbst und wartet nicht auf eine laufende Lesung. Ohne gemerkte Übersicht gibt es auch keinen Haken —
    /// ein Haken wird erst nach der Lesung gesetzt.
    /// </summary>
    public Dateiuebersicht GemerktOderLeer()
    {
        var bisherGemerkt = Volatile.Read(ref gemerkt);
        if (bisherGemerkt is null)
        {
            return new Dateiuebersicht([], []);
        }
        return bisherGemerkt;
    }

    /// <summary>
    /// Liest die Übersicht für einen Zugriff, der ohne sie nichts entscheiden kann: ein Fehler wird protokolliert und als
    /// <paramref name="grund"/> gemeldet — die eine Stelle für alle Leser (Haken, Angesehen). Der Aufrufer macht daraus seinen Ausgang.
    /// </summary>
    public bool VersucheZuLesen(StderrProtokoll protokoll, string kontext, string grundNichtLesbar, out Dateiuebersicht gelesen, out string grund)
    {
        grund = string.Empty;
        try
        {
            gelesen = Lesen();
            return true;
        }
        catch (GitZuGross zuGross)
        {
            protokoll.Melde(Protokollstufe.Warnung, kontext, $"Übersicht der Dateien {zuGross.UiGrund}: Ausgabegrenze von {zuGross.Grenze} Byte überschritten");
            grund = zuGross.UiGrund;
            gelesen = new Dateiuebersicht([], []);
            return false;
        }
        catch (GitFehler fehler)
        {
            protokoll.Melde(Protokollstufe.Fehler, kontext, $"Übersicht der Dateien nicht lesbar: {fehler.Message}");
            grund = grundNichtLesbar;
            gelesen = new Dateiuebersicht([], []);
            return false;
        }
    }
}
