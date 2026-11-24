namespace GitReviewA.Anmerkungen;

internal sealed record AnnotierenErgebnis(Annotierenausgang Ausgang, Anmerkung? Angelegt, string Grund);
