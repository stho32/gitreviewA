using GitReviewA.Aufruf;
using GitReviewA.Protokoll;

namespace GitReviewA.Beenden;

/// <summary>
/// Die eine Abbruchzeile für beide Laufarten (R00005, R00043; PO 2026-11-26, `AI-Team/po-entscheidungen.md` Zeile 275): sie
/// nennt je Laufart, was abgebrochen wurde. Der Review behält **wörtlich** „Review abgebrochen“ — das ist die Schnittstelle für
/// auswertende Aufrufer —, die Dateiansicht nennt ihre eigene Laufart, weil in ihr kein Review läuft. Die Laufart kommt aus dem
/// <see cref="Aufrufleser"/>; keine zweite Stelle schreibt diesen Wortlaut.
/// </summary>
internal static class Abbruchzeile
{
    private const string Kontext = "Abbruch";

    public static string Fuer(Laufart laufart)
    {
        return laufart == Laufart.Dateiansicht ? "Dateiansicht abgebrochen" : "Review abgebrochen";
    }

    /// <summary>Schreibt die Abbruchzeile als Warnung auf stderr — Stufe und Kontext sind für beide Laufarten dieselben.</summary>
    public static void Melde(StderrProtokoll protokoll, Laufart laufart)
    {
        protokoll.Melde(Protokollstufe.Warnung, Kontext, Fuer(laufart));
    }
}