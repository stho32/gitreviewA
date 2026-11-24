using System.Diagnostics.CodeAnalysis;

namespace GitReviewA.Anmerkungen;

/// <summary>
/// Anmerkungen des Laufs, nur im Arbeitsspeicher. Anhängen und Abschließen stehen unter derselben Sperre:
/// was nach dem Abschluss kommt, wird abgelehnt und kann nicht still aus dem Ergebnis fallen.
/// Jede Anmerkung bekommt eine stabile Nummer aus einem Zähler, die nie wiederverwendet wird (Ändern und Löschen adressieren über sie).
/// </summary>
internal class Anmerkungsspeicher
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

    /// <summary>Die Anmerkung zu <paramref name="nummer"/> oder <c>null</c>, wenn es sie nicht gibt.</summary>
    public Anmerkung? Finde(int nummer)
    {
        lock (sperre)
        {
            return anmerkungen.Find(anmerkung => anmerkung.Nummer == nummer);
        }
    }

    /// <summary>Ersetzt allein den Text; Nummer, Stelle und Position in der Liste bleiben. Nach dem Abschluss wird abgelehnt.
        /// Virtuell, damit eine Probe den Zwischenzustand „zwischen Finden und Ersetzen weggefallen“ (Löschen) deterministisch stellen kann.</summary>
    public virtual Aenderungsausgang VersucheZuAendern(int nummer, string text, out Anmerkung? geaendert)
    {
        lock (sperre)
        {
            if (istAbgeschlossen)
            {
                geaendert = null;
                return Aenderungsausgang.Beendet;
            }
            var stelle = anmerkungen.FindIndex(anmerkung => anmerkung.Nummer == nummer);
            var istBekannt = stelle >= 0;
            if (!istBekannt)
            {
                geaendert = null;
                return Aenderungsausgang.NichtGefunden;
            }
            geaendert = anmerkungen[stelle] with { Text = text };
            anmerkungen[stelle] = geaendert;
            return Aenderungsausgang.Geaendert;
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
