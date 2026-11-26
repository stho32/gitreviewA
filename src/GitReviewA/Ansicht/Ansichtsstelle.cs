namespace GitReviewA.Ansicht;

/// <summary>Eine gemeldete Stelle; jedes Feld kann fehlen und wird im <see cref="AngesehenInteractor"/> geprüft.</summary>
internal sealed record Ansichtsstelle(string? Commit, string? Datei);
