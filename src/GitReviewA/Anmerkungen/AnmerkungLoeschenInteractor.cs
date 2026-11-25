using System.Globalization;
using GitReviewA.Protokoll;

namespace GitReviewA.Anmerkungen;

/// <summary>
/// Interaction „Anmerkung löschen“ (R00019): sucht die Anmerkung über ihre stabile Nummer und entfernt sie im Speicher.
/// Löschen ist keine Aussage — es prüft weder den Text noch die Sperre der Stelle (R00014); Anlegen und Ändern bleiben dort abgelehnt.
/// Nach dem Beenden gewinnt 409. Das Protokoll nennt die Nummer, nie den Text.
/// </summary>
internal sealed class AnmerkungLoeschenInteractor(Anmerkungsspeicher speicher, StderrProtokoll protokoll)
{
    private const string Kontext = "Anmerkung";

    public Loeschungsergebnis Loesche(Loeschungswunsch wunsch)
    {
        var nummer = wunsch.Nummer;
        var anmerkung = speicher.Finde(nummer);
        if (anmerkung is null)
        {
            return Abgelehnt(Loeschungsausgang.NichtGefunden, NichtGefundenGrund(nummer));
        }
        var ausgang = speicher.VersucheZuLoeschen(nummer, out var geloescht);
        if (ausgang is not Loeschungsausgang.Geloescht)
        {
            return Abgelehnt(ausgang, GrundFuer(ausgang, nummer));
        }
        MeldeGeloescht(geloescht!);
        return new Loeschungsergebnis(Loeschungsausgang.Geloescht, geloescht, string.Empty);
    }

    private Loeschungsergebnis Abgelehnt(Loeschungsausgang ausgang, string grund)
    {
        protokoll.Melde(Protokollstufe.Debug, Kontext, $"abgelehnt: {grund}");
        return new Loeschungsergebnis(ausgang, null, grund);
    }

    private void MeldeGeloescht(Anmerkung geloeschte)
    {
        var nummer = geloeschte.Nummer.ToString(CultureInfo.InvariantCulture);
        protokoll.Melde(Protokollstufe.Debug, Kontext, $"Nummer {nummer} gelöscht");
    }

    private static string NichtGefundenGrund(int nummer)
    {
        return $"Anmerkung {nummer.ToString(CultureInfo.InvariantCulture)} gibt es nicht";
    }

    /// <summary>Der Grund eines Nicht-Erfolgs aus dem Speicher: beendet, oder die Nummer ist zwischen Finden und Entfernen weggefallen.</summary>
    private static string GrundFuer(Loeschungsausgang ausgang, int nummer)
    {
        if (ausgang is Loeschungsausgang.Beendet)
        {
            return AnmerkungMeldungen.Beendet;
        }
        return NichtGefundenGrund(nummer);
    }
}
