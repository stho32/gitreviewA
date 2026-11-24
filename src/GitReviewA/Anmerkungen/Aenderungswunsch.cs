namespace GitReviewA.Anmerkungen;

/// <summary>Der ungeprüfte Änderungswunsch: die Nummer aus dem Pfad und der Text aus dem Körper.</summary>
internal sealed record Aenderungswunsch(int Nummer, string? Text);