using System.Text.Json;

namespace GitReviewA.Anmerkungen;

/// <summary>
/// Ungeprüfte Eingabe aus dem JSON-Körper einer Änderung; der Text kann fehlen. `art` ist roh: fehlt das Feld, bleibt die gespeicherte
/// Art; ausdrückliches `null` entfernt sie; ein Wert setzt oder wechselt sie (R00036).
/// </summary>
internal sealed record Aenderungskoerper(string? Text, JsonElement Art = default);
