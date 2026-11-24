using System.Globalization;
using GitReviewA.Haken;
using GitReviewA.Protokoll;

namespace GitReviewA.Anmerkungen;

/// <summary>
/// Interaction „Anmerkung ändern“ (R00018): prüft den neuen Text mit derselben Regel wie das Anlegen, sucht die Anmerkung über ihre
/// stabile Nummer, prüft die Sperre ihrer Stelle (R00014) und ersetzt unter der Sperre des Speichers nur den Text — Nummer, Stelle und
/// Position bleiben. Prüfreihenfolge wie beim Anlegen, Form zuerst und Speicher zuletzt; nach dem Beenden gewinnt 409.
/// Das Protokoll nennt Nummer und Textlänge, nie den Text.
/// </summary>
internal sealed class AnmerkungAendernInteractor(Anmerkungsspeicher speicher, Stellensperre sperre, StderrProtokoll protokoll)
{
    private const string Kontext = "Anmerkung";

    public Aenderungsergebnis Aendere(Aenderungswunsch? wunsch)
    {
        var text = wunsch?.Text;
        if (!Anmerkungstext.IstGueltig(text, out var textGrund))
        {
            return Abgelehnt(Aenderungsausgang.Ungueltig, textGrund);
        }
        var nummer = wunsch!.Nummer;
        var anmerkung = speicher.Finde(nummer);
        if (anmerkung is null)
        {
            return Abgelehnt(Aenderungsausgang.NichtGefunden, NichtGefundenGrund(nummer));
        }
        if (speicher.IstAbgeschlossen)
        {
            return Abgelehnt(Aenderungsausgang.Beendet, AnmerkungMeldungen.Beendet);
        }
        var sperrgrund = sperre.SperrgrundVon(anmerkung.Commit, anmerkung.Datei);
        var istGesperrt = sperrgrund.Length > 0;
        if (istGesperrt)
        {
            return Abgelehnt(Aenderungsausgang.Ungueltig, sperrgrund);
        }
        var ausgang = speicher.VersucheZuAendern(nummer, text, out var geaenderte);
        if (ausgang is not Aenderungsausgang.Geaendert)
        {
            return Abgelehnt(ausgang, GrundFuer(ausgang, nummer));
        }
        MeldeGeaendert(geaenderte!);
        return new Aenderungsergebnis(Aenderungsausgang.Geaendert, geaenderte, string.Empty);
    }

    private Aenderungsergebnis Abgelehnt(Aenderungsausgang ausgang, string grund)
    {
        protokoll.Melde(Protokollstufe.Debug, Kontext, $"abgelehnt: {grund}");
        return new Aenderungsergebnis(ausgang, null, grund);
    }

    private void MeldeGeaendert(Anmerkung geaenderte)
    {
        var nummer = geaenderte.Nummer.ToString(CultureInfo.InvariantCulture);
        var textlaenge = geaenderte.Text.Length.ToString(CultureInfo.InvariantCulture);
        protokoll.Melde(Protokollstufe.Debug, Kontext, $"Nummer {nummer} geändert (Textlänge {textlaenge})");
    }

    private static string NichtGefundenGrund(int nummer)
    {
        return $"Anmerkung {nummer.ToString(CultureInfo.InvariantCulture)} gibt es nicht";
    }

    /// <summary>Der Grund eines Nicht-Erfolgs aus dem Speicher: beendet, oder die Nummer ist zwischen Finden und Ersetzen weggefallen (Löschen).</summary>
    private static string GrundFuer(Aenderungsausgang ausgang, int nummer)
    {
        if (ausgang is Aenderungsausgang.Beendet)
        {
            return AnmerkungMeldungen.Beendet;
        }
        return NichtGefundenGrund(nummer);
    }
}