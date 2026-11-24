namespace GitReviewA.Haken;

/// <summary>Körper von `POST /api/haken`; jedes Feld kann fehlen und wird erst im <see cref="HakenPruefer"/> geprüft.</summary>
internal sealed record Hakenanfrage(string? Commit, string? Datei, bool? Abgehakt);
