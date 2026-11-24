namespace GitReviewA.Anmerkungen;

/// <summary>Ungeprüfte Eingabe aus dem JSON-Körper einer Änderung; der Text kann fehlen.</summary>
internal sealed record Aenderungskoerper(string? Text);