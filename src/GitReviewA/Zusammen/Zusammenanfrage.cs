using GitReviewA.Git;

namespace GitReviewA.Zusammen;

/// <summary>Die Anfrage des Browsers nach dem Diff einer Datei in „Zusammen“; `Pfad` ist der Anzeigepfad aus der Netto-Liste.</summary>
internal sealed record Zusammenanfrage(string Pfad, Diffumfang Umfang);
