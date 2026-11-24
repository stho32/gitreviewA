using System.Diagnostics.CodeAnalysis;

namespace GitReviewA.Anmerkungen;

/// <summary>
/// Anmerkungen des Laufs, nur im Arbeitsspeicher. Anhängen und Abschließen stehen unter derselben Sperre:
/// was nach dem Abschluss kommt, wird abgelehnt und kann nicht still aus dem Ergebnis fallen.
/// </summary>
internal sealed class Anmerkungsspeicher
{
    private readonly Lock sperre = new();
    private readonly List<Anmerkung> anmerkungen = [];
    private bool istAbgeschlossen;

    public bool IstAbgeschlossen
    {
        get
        {
            lock (sperre)
            {
                return istAbgeschlossen;
            }
        }
    }

    public bool VersucheAnzuhaengen(GepruefteAnmerkung inhalt, [NotNullWhen(true)] out Anmerkung? angelegt)
    {
        lock (sperre)
        {
            if (istAbgeschlossen)
            {
                angelegt = null;
                return false;
            }
            angelegt = new Anmerkung(anmerkungen.Count + 1, inhalt.Commit, inhalt.Datei, inhalt.Zeile, inhalt.Text);
            anmerkungen.Add(angelegt);
            return true;
        }
    }

    public bool VersucheAbzuschliessen()
    {
        lock (sperre)
        {
            var warSchonAbgeschlossen = istAbgeschlossen;
            istAbgeschlossen = true;
            return !warSchonAbgeschlossen;
        }
    }

    public Anmerkungsliste Schnappschuss()
    {
        lock (sperre)
        {
            return new Anmerkungsliste(anmerkungen);
        }
    }
}
