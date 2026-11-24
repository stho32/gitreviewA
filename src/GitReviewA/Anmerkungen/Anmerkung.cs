namespace GitReviewA.Anmerkungen;

internal sealed record Anmerkung(int Nummer, string Commit, string Datei, int? Zeile, string Text);
