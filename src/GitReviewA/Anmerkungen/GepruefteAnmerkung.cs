namespace GitReviewA.Anmerkungen;

internal sealed record GepruefteAnmerkung(string Commit, string Datei, int? Zeile, string Text);
