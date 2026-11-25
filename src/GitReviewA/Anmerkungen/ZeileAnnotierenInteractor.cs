using System.Globalization;
using GitReviewA.Haken;
using GitReviewA.Protokoll;

namespace GitReviewA.Anmerkungen;

/// <summary>
/// Interaction „Zeile annotieren“: prüft die Anfrage (Auswahl, Datei, Zeile, Text) und die Sperre der Stelle (R00014), legt die Anmerkung im Speicher an oder lehnt ab
/// und listet die Anmerkungen des Laufs. Das Protokoll nennt Nummer und Textlänge, nie den Text.
/// </summary>
internal sealed class ZeileAnnotierenInteractor(Anmerkungsspeicher speicher, CommitAuswahl auswahl, Stellensperre sperre, StderrProtokoll protokoll)
{
    private const string Kontext = "Anmerkung";

    public AnnotierenErgebnis LegeAn(NeueAnmerkung? neu)
    {
        var pruefung = AnmerkungsPruefer.Pruefe(neu, auswahl);
        if (!pruefung.IstGueltig)
        {
            protokoll.Melde(Protokollstufe.Debug, Kontext, $"abgelehnt: {pruefung.Ablehnungsgrund}");
            return new AnnotierenErgebnis(Annotierenausgang.Ungueltig, null, pruefung.Ablehnungsgrund);
        }
        var sperrgrund = sperre.SperrgrundVon(pruefung.Anmerkung.Commit, pruefung.Anmerkung.Datei);
        var istGesperrt = sperrgrund.Length > 0;
        if (istGesperrt)
        {
            protokoll.Melde(Protokollstufe.Debug, Kontext, $"abgelehnt: {sperrgrund}");
            return new AnnotierenErgebnis(Annotierenausgang.Ungueltig, null, sperrgrund);
        }
        if (!speicher.VersucheAnzuhaengen(pruefung.Anmerkung, out var angelegt))
        {
            protokoll.Melde(Protokollstufe.Debug, Kontext, "abgelehnt: Review ist beendet");
            return new AnnotierenErgebnis(Annotierenausgang.Beendet, null, AnmerkungMeldungen.Beendet);
        }
        var nummer = angelegt.Nummer.ToString(CultureInfo.InvariantCulture);
        var textlaenge = angelegt.Text.Length.ToString(CultureInfo.InvariantCulture);
        var art = Anmerkungsart.Protokollwert(angelegt.Art);
        protokoll.Melde(Protokollstufe.Debug, Kontext, $"Nummer {nummer} angelegt ({Stellentext(angelegt)}Textlänge {textlaenge}, art={art})");
        return new AnnotierenErgebnis(Annotierenausgang.Angelegt, angelegt, string.Empty);
    }

    /// <summary>Der Bereich als `Bereich 3–7, ` vor der Textlänge; eine Zeilen- und Dateianmerkung bleibt wie in R00010 (kein Zusatz).</summary>
    private static string Stellentext(Anmerkung anmerkung)
    {
        if (anmerkung.Von is { } von && anmerkung.Bis is { } bis)
        {
            return string.Create(CultureInfo.InvariantCulture, $"Bereich {von}–{bis}, ");
        }
        return string.Empty;
    }

    public Anmerkungsliste Liste()
    {
        return speicher.Schnappschuss();
    }
}
