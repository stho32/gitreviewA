namespace GitReviewA.Zusammen;

/// <summary>
/// Der Stand der Zusammen-Ansicht: ob die Auswahl lückenlos ist, ihre Basis, die Spitze (jüngster Commit der Kette) und die Netto-Liste.
/// Ist er nicht lesbar (git scheitert), ist die Liste leer.
/// </summary>
internal sealed record Zusammenstand(bool IstLesbar, bool Lueckenlos, string Basis, string Spitze, NettoDateiliste Dateien);
