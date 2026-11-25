using GitReviewA.Git;

namespace GitReviewA.Zusammen;

/// <summary>Die Anfrage des Browsers nach dem Diff einer Datei in „Zusammen“; `Pfad` ist der Anzeigepfad aus der Netto-Liste,
/// `Leerraum` die Vergleichsstellung (R00026) — sie gilt für den Netto-Diff und für die Abschnitte ohne Kette.</summary>
internal sealed record Zusammenanfrage(string Pfad, Diffumfang Umfang, Leerraum Leerraum);
