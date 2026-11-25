namespace GitReviewA.Anmerkungen;

/// <summary>Ausgang eines Löschens, den der Endpunkt auf 200, 404 oder 409 abbildet.</summary>
internal sealed record Loeschungsergebnis(Loeschungsausgang Ausgang, Anmerkung? Geloeschte, string Grund);
