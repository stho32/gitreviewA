namespace GitReviewA.Anmerkungen;

/// <summary>Ausgang einer Änderung, den der Endpunkt auf 200, 400, 404 oder 409 abbildet.</summary>
internal sealed record Aenderungsergebnis(Aenderungsausgang Ausgang, Anmerkung? Geaenderte, string Grund);