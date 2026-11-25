using System.Text.Json;

namespace GitReviewA.Anmerkungen;

/// <summary>
/// Ungeprüfte Eingabe aus dem JSON-Körper; jedes Feld kann fehlen. `von`/`bis` tragen den Zeilenbereich statt `zeile`, `art` die
/// Art der Anmerkung (R00036) — roh, damit „fehlt“, ausdrücklich „ohne“ und ein unbekannter Wert unterscheidbar bleiben.
/// </summary>
internal sealed record NeueAnmerkung(string? Commit, string? Datei, int? Zeile, string? Text, int? Von = null, int? Bis = null, JsonElement Art = default);
