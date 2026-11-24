namespace GitReviewA.Anmerkungen;

/// <summary>Ungeprüfte Eingabe aus dem JSON-Körper; jedes Feld kann fehlen.</summary>
internal sealed record NeueAnmerkung(string? Commit, string? Datei, int? Zeile, string? Text);
