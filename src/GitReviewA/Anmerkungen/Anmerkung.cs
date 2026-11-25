namespace GitReviewA.Anmerkungen;

/// <summary>
/// Eine Anmerkung des Laufs: `zeile` für eine Zeile, `von`/`bis` für einen Bereich (Nummer neu), beide `null` für die ganze Datei.
/// Zeile und Bereich schließen sich aus (der Prüfer lehnt beides zusammen ab). `art` ist Muss, Frage, Idee oder fehlt (R00036) —
/// die Stelle (Datei/Zeile/Bereich) und die Art sind zwei Dimensionen und werden nie vermischt.
/// </summary>
internal sealed record Anmerkung(int Nummer, string Commit, string Datei, int? Zeile, string Text, int? Von = null, int? Bis = null, Art? Art = null);
