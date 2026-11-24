namespace GitReviewA.Haken;

/// <summary>Antwortmodell von `GET /api/haken` für den JSON-Serialisierer.</summary>
internal sealed record HakenstandAntwort(List<Stellenstand> Stellen, int Abgehakt, int Gesamt);
