namespace GitReviewA.Ansicht;

/// <summary>Körper von `POST /api/angesehen`: die Stellen, die der Diff-Bereich einer Datei gezeigt hat.</summary>
internal sealed record Ansichtanfrage(List<Ansichtsstelle>? Stellen);
