using System.Globalization;
using GitReviewA.Protokoll;

namespace GitReviewA.Anmerkungen;

/// <summary>
/// Interaction „Zeile annotieren“: prüft die Anfrage (Auswahl, Datei, Zeile, Text), legt die Anmerkung im Speicher an oder lehnt ab
/// und listet die Anmerkungen des Laufs. Das Protokoll nennt Nummer und Textlänge, nie den Text.
/// </summary>
internal sealed class ZeileAnnotierenInteractor(Anmerkungsspeicher speicher, CommitAuswahl auswahl, StderrProtokoll protokoll)
{
    private const string Kontext = "Anmerkung";
    private const string BeendetGrund = "Review ist beendet — keine Anmerkung mehr möglich";

    public AnnotierenErgebnis LegeAn(NeueAnmerkung? neu)
    {
        var pruefung = AnmerkungsPruefer.Pruefe(neu, auswahl);
        if (!pruefung.IstGueltig)
        {
            protokoll.Melde(Protokollstufe.Debug, Kontext, $"abgelehnt: {pruefung.Ablehnungsgrund}");
            return new AnnotierenErgebnis(Annotierenausgang.Ungueltig, null, pruefung.Ablehnungsgrund);
        }
        if (!speicher.VersucheAnzuhaengen(pruefung.Anmerkung, out var angelegt))
        {
            protokoll.Melde(Protokollstufe.Debug, Kontext, "abgelehnt: Review ist beendet");
            return new AnnotierenErgebnis(Annotierenausgang.Beendet, null, BeendetGrund);
        }
        var nummer = angelegt.Nummer.ToString(CultureInfo.InvariantCulture);
        var textlaenge = angelegt.Text.Length.ToString(CultureInfo.InvariantCulture);
        protokoll.Melde(Protokollstufe.Debug, Kontext, $"Nummer {nummer} angelegt (Textlänge {textlaenge})");
        return new AnnotierenErgebnis(Annotierenausgang.Angelegt, angelegt, string.Empty);
    }

    public Anmerkungsliste Liste()
    {
        return speicher.Schnappschuss();
    }
}
