namespace GitReviewA.Haken;

/// <summary>Eine Datei in einem Commit: voller Hash und Pfad wie in der Dateiliste (bei einer Umbenennung der neue Pfad).</summary>
internal sealed record Stelle(string Commit, string Pfad);
