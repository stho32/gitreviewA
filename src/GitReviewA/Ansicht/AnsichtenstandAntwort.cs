namespace GitReviewA.Ansicht;

/// <summary>Antwortmodell von `GET /api/angesehen` für den JSON-Serialisierer.</summary>
internal sealed record AnsichtenstandAntwort(List<AnsichtsstelleAntwort> Stellen, int Anzahl);
