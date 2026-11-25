using System.Text.Json;

namespace GitReviewA.Anmerkungen;

/// <summary>Der ungeprüfte Änderungswunsch: die Nummer aus dem Pfad, der Text und die rohe Art aus dem Körper.</summary>
internal sealed record Aenderungswunsch(int Nummer, string? Text, JsonElement Art = default);
