namespace GitReviewA.Anmerkungen;

/// <summary>
/// Eine Anmerkung des Laufs: `zeile` für eine Zeile, `von`/`bis` für einen Bereich (Nummer neu), beide `null` für die ganze Datei.
/// Zeile und Bereich schließen sich aus (der Prüfer lehnt beides zusammen ab).
/// </summary>
internal sealed record Anmerkung(int Nummer, string Commit, string Datei, int? Zeile, string Text, int? Von = null, int? Bis = null);
