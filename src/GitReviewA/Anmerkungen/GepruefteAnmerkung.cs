namespace GitReviewA.Anmerkungen;

/// <summary>Geprüfte Eingabe: `zeile` oder der Bereich `von`/`bis` oder keins von beiden (ganze Datei); `art` ist geprüft oder fehlt.</summary>
internal sealed record GepruefteAnmerkung(string Commit, string Datei, int? Zeile, string Text, int? Von = null, int? Bis = null, Art? Art = null);
