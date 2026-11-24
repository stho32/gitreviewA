using System.Diagnostics.CodeAnalysis;

namespace GitReviewA.Anmerkungen;

/// <summary>
/// Anmerkungen des Laufs, nur im Arbeitsspeicher. Anhängen und Abschließen stehen unter derselben Sperre:
/// was nach dem Abschluss kommt, wird abgelehnt und kann nicht still aus dem Ergebnis fallen.
/// Jede Anmerkung bekommt eine stabile Nummer aus einem Zähler, die nie wiederverwendet wird (Ändern und Löschen adressieren über sie).
/// </summary>
internal sealed class Anmerkungsspeicher
{
    private readonly Lock sperre = new();
    private readonly List<Anmerkung> anmerkungen = [];
    private bool istAbgeschlossen;
    private int letzteNummer;

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
            letzteNummer += 1;
            angelegt = new Anmerkung(letzteNummer, inhalt.Commit, inhalt.Datei, inhalt.Zeile, inhalt.Text);
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
