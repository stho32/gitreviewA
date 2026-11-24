using GitReviewA.Fremdtext;
using GitReviewA.Git;
using GitReviewA.Protokoll;

namespace GitReviewA.Haken;

/// <summary>
/// Interaction „Datei abhaken“: setzt oder entnimmt den Haken einer Stelle der Auswahl, liefert den Stand aller Stellen und, nach dem
/// Siegel, den Stand für das Ergebnis. Die Übersicht wird beim ersten Zugriff gelesen; eine abgelehnte Stelle startet kein git.
/// </summary>
internal sealed class DateiAbhakenInteractor
{
    private const string Kontext = "Haken";
    private const string BeendetGrund = "Review ist beendet — kein Haken mehr möglich";
    private const string NichtLesbarGrund = "Fortschritt konnte nicht gelesen werden";
    private const int KurzHashLaenge = 7;

    private readonly GemerkteUebersicht uebersicht;
    private readonly Hakenspeicher speicher;
    private readonly StderrProtokoll protokoll;

    public DateiAbhakenInteractor(IUebersichtsquelle quelle, Hakenspeicher speicher, StderrProtokoll protokoll)
    {
        uebersicht = new GemerkteUebersicht(quelle);
        this.speicher = speicher;
        this.protokoll = protokoll;
    }

    public Hakenergebnis Setze(Hakenanfrage? anfrage)
    {
        if (!HakenPruefer.IstVollstaendig(anfrage, out var wunsch, out var formgrund))
        {
            return Abgelehnt(Hakenausgang.Ungueltig, formgrund);
        }
        if (!VersucheUebersichtZuLesen(out var gelesen))
        {
            return Abgelehnt(Hakenausgang.NichtLesbar, NichtLesbarGrund);
        }
        if (!HakenPruefer.GehoertZurAuswahl(wunsch.Stelle, gelesen, out var stellengrund))
        {
            return Abgelehnt(Hakenausgang.Ungueltig, stellengrund);
        }
        if (!speicher.VersucheZuSetzen(wunsch.Stelle, wunsch.Abgehakt))
        {
            return Abgelehnt(Hakenausgang.Beendet, BeendetGrund);
        }
        MeldeGesetzt(wunsch);
        return new Hakenergebnis(Hakenausgang.Gesetzt, speicher.Schnappschuss().Anzahl, gelesen.Anzahl, string.Empty);
    }

    public Hakenstand Stand()
    {
        if (!VersucheUebersichtZuLesen(out var gelesen))
        {
            return new Hakenstand(false, new Dateienstand([]));
        }
        return new Hakenstand(true, Dateienstand.Aus(gelesen, speicher.Schnappschuss()));
    }

    /// <summary>Liest git nie: ohne gelesene Übersicht konnte kein Haken gesetzt werden.</summary>
    public Dateienstand Ergebnisstand()
    {
        return Dateienstand.Aus(uebersicht.GemerktOderLeer(), speicher.Schnappschuss());
    }

    private Hakenergebnis Abgelehnt(Hakenausgang ausgang, string grund)
    {
        protokoll.Melde(Protokollstufe.Debug, Kontext, $"abgelehnt: {grund}");
        return new Hakenergebnis(ausgang, 0, 0, grund);
    }

    private bool VersucheUebersichtZuLesen(out Dateiuebersicht gelesen)
    {
        try
        {
            gelesen = uebersicht.Lesen();
            return true;
        }
        catch (GitFehler fehler)
        {
            protokoll.Melde(Protokollstufe.Fehler, Kontext, $"Übersicht der Dateien nicht lesbar: {fehler.Message}");
            gelesen = new Dateiuebersicht([], []);
            return false;
        }
    }

    private void MeldeGesetzt(Hakenwunsch wunsch)
    {
        var zielzustand = "nein";
        if (wunsch.Abgehakt)
        {
            zielzustand = "ja";
        }
        var kurz = wunsch.Stelle.Commit[..KurzHashLaenge];
        protokoll.Melde(Protokollstufe.Debug, Kontext, $"Commit {kurz} {UnsichtbareZeichen.AlsMarken(wunsch.Stelle.Pfad)} abgehakt: {zielzustand}");
    }
}
