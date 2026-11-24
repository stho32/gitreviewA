namespace GitReviewA.Zusammen;

/// <summary>Ein Commit der Auswahl und sein erster Eltern-Hash; leer, wenn der Commit eine Wurzel ist.</summary>
internal sealed record Elternzeile(string Commit, string Eltern);
