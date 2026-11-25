namespace GitReviewA.Anmerkungen;

/// <summary>Ungeprüfte Eingabe aus dem JSON-Körper; jedes Feld kann fehlen. `von`/`bis` tragen den Zeilenbereich statt `zeile`.</summary>
internal sealed record NeueAnmerkung(string? Commit, string? Datei, int? Zeile, string? Text, int? Von = null, int? Bis = null);
