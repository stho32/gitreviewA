namespace GitReviewA.Zusammen;

/// <summary>
/// Der Stand der Zusammen-Ansicht: ob die Auswahl lückenlos ist, ihre Basis, die Spitze (jüngster Commit der Kette) und die Netto-Liste.
/// Ist er nicht lesbar (git scheitert), ist die Liste leer; ein nicht leerer <see cref="ZuGrossGrund"/> unterscheidet „über der
/// Ausgabegrenze“ von einem anderen Fehler — die Ansicht zeigt dann ihren Fehlerzustand mit dem Grund „zu groß“ (R00048 Kriterium 7).
/// </summary>
internal sealed record Zusammenstand(bool IstLesbar, bool Lueckenlos, string Basis, string Spitze, NettoDateiliste Dateien, string ZuGrossGrund = "");
