namespace GitReviewA.Haken;

/// <summary>Ein Stapelwunsch: die Datei der Netto-Liste und ihr Zielzustand (eine Anfrage setzt oder entnimmt alle ihre Stellen).</summary>
internal sealed record Stapelwunsch(string Datei, bool Abgehakt);
