namespace GitReviewA.Haken;

/// <summary>`Sperrgrund` ist leer, wenn der Diff der Stelle lesbar ist.</summary>
internal sealed record Stellenstand(string Commit, string Datei, bool Abgehakt, string Sperrgrund);
