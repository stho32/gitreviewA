namespace GitReviewA.Bild;

/// <summary>`Hash` und `Pfad` wie angefragt, noch ungeprüft; `Seite` ist bereits aus der festen Liste gelesen.</summary>
internal sealed record Bildanfrage(string Hash, string Pfad, Bildseite Seite);
