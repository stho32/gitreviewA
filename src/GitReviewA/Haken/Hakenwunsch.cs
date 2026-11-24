namespace GitReviewA.Haken;

/// <summary>Eine vollständige Hakenanfrage: Stelle und Zielzustand.</summary>
internal sealed record Hakenwunsch(Stelle Stelle, bool Abgehakt);
