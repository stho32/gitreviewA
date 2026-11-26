using GitReviewA.Fremdtext;
using GitReviewA.Protokoll;
using GitReviewA.Zusammen;

namespace GitReviewA.Haken;

/// <summary>
/// Interaction „Datei abhaken“: setzt oder entnimmt den Haken einer Stelle der Auswahl, setzt einen Stapel über alle Stellen einer
/// Datei der Netto-Liste (atomar, ganz abgelehnt, wenn eine Stelle gesperrt ist), liefert den Stand aller Stellen und, nach dem
/// Siegel, den Stand für das Ergebnis. Die Übersicht wird beim ersten Zugriff gelesen; eine abgelehnte Stelle startet kein git.
/// </summary>
internal sealed class DateiAbhakenInteractor
{
    private const string Kontext = "Haken";
    private const string BeendetGrund = "Review ist beendet — kein Haken mehr möglich";
    private const string NichtLesbarGrund = "Fortschritt konnte nicht gelesen werden";
    private const string NichtInDerListeGrund = "Datei steht nicht in der Netto-Liste";
    private const int KurzHashLaenge = 7;

    private readonly GemerkteUebersicht uebersicht;
    private readonly Hakenspeicher speicher;
    private readonly INettoDateiliste nettoListe;
    private readonly StderrProtokoll protokoll;

    public DateiAbhakenInteractor(GemerkteUebersicht uebersicht, Hakenspeicher speicher, INettoDateiliste nettoListe, StderrProtokoll protokoll)
    {
        this.uebersicht = uebersicht;
        this.speicher = speicher;
        this.nettoListe = nettoListe;
        this.protokoll = protokoll;
    }

    /// <summary>Ohne `commit` ist es der Stapel über die Datei der Netto-Liste, mit `commit` die einzelne Stelle.</summary>
    public Hakenergebnis Setze(Hakenanfrage? anfrage)
    {
        var istStapel = anfrage is not null && string.IsNullOrEmpty(anfrage.Commit);
        return istStapel ? SetzeStapel(anfrage) : SetzeStelle(anfrage);
    }

    public Hakenstand Stand()
    {
        if (!uebersicht.VersucheZuLesen(protokoll, Kontext, NichtLesbarGrund, out var gelesen, out _))
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

    private Hakenergebnis SetzeStelle(Hakenanfrage? anfrage)
    {
        if (!HakenPruefer.IstVollstaendig(anfrage, out var wunsch, out var formgrund))
        {
            return Abgelehnt(Hakenausgang.Ungueltig, formgrund);
        }
        if (!uebersicht.VersucheZuLesen(protokoll, Kontext, NichtLesbarGrund, out var gelesen, out var nichtLesbarGrund))
        {
            return Abgelehnt(Hakenausgang.NichtLesbar, nichtLesbarGrund);
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

    /// <summary>
    /// Der Stapel steht für „ich habe die Datei über alle Commits gelesen“: enthält sie irgendeine gesperrte Stelle, wird er ganz
    /// abgelehnt und nichts gespeichert (product-owner 2026-11-24, Zeile 91).
    /// </summary>
    private Hakenergebnis SetzeStapel(Hakenanfrage? anfrage)
    {
        if (!HakenPruefer.IstStapel(anfrage, out var stapel, out var formgrund))
        {
            return Abgelehnt(Hakenausgang.Ungueltig, formgrund);
        }
        if (!uebersicht.VersucheZuLesen(protokoll, Kontext, NichtLesbarGrund, out var gelesen, out var nichtLesbarGrund))
        {
            return Abgelehnt(Hakenausgang.NichtLesbar, nichtLesbarGrund);
        }
        var treffer = nettoListe.DateienMitAnzeigepfad(stapel.Datei);
        if (!treffer.IstLesbar)
        {
            return Abgelehnt(Hakenausgang.NichtLesbar, NichtLesbarGrund);
        }
        var sperrgrundDesNamens = nettoListe.Sperrgrund(stapel.Datei);
        if (sperrgrundDesNamens.Length > 0)
        {
            return Abgelehnt(Hakenausgang.Ungueltig, sperrgrundDesNamens);
        }
        var stellen = StellenDerDatei(treffer.Dateien);
        if (stellen.Count == 0)
        {
            return Abgelehnt(Hakenausgang.Ungueltig, NichtInDerListeGrund);
        }
        foreach (var stelle in stellen)
        {
            var sperrgrund = gelesen.SperrgrundVon(stelle);
            if (sperrgrund.Length > 0)
            {
                return Abgelehnt(Hakenausgang.Ungueltig, sperrgrund);
            }
        }
        if (!speicher.VersucheZuSetzen(stellen, stapel.Abgehakt))
        {
            return Abgelehnt(Hakenausgang.Beendet, BeendetGrund);
        }
        MeldeStapel(stapel, stellen);
        return new Hakenergebnis(Hakenausgang.Gesetzt, speicher.Schnappschuss().Anzahl, gelesen.Anzahl, string.Empty);
    }

    /// <summary>Die Stellen aller Einträge mit diesem Anzeigepfad, jede einmal (ein Doppelgänger-Paar teilt sich dieselbe Stelle).</summary>
    private static List<Stelle> StellenDerDatei(NettoDatei[] dateien)
    {
        var stellen = new List<Stelle>();
        var gesehen = new HashSet<Stelle>();
        foreach (var datei in dateien)
        {
            foreach (var nettoStelle in datei.Stellen)
            {
                if (gesehen.Add(nettoStelle.Stelle()))
                {
                    stellen.Add(nettoStelle.Stelle());
                }
            }
        }
        return stellen;
    }

    private Hakenergebnis Abgelehnt(Hakenausgang ausgang, string grund)
    {
        protokoll.Melde(Protokollstufe.Debug, Kontext, $"abgelehnt: {grund}");
        return new Hakenergebnis(ausgang, 0, 0, grund);
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

    private void MeldeStapel(Stapelwunsch stapel, List<Stelle> stellen)
    {
        var zielzustand = stapel.Abgehakt ? "ja" : "nein";
        protokoll.Melde(Protokollstufe.Debug, Kontext, $"Datei {UnsichtbareZeichen.AlsMarken(stapel.Datei)} abgehakt: {zielzustand} ({stellen.Count} Stellen)");
    }
}
