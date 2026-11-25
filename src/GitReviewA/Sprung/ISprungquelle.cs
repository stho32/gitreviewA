namespace GitReviewA.Sprung;

/// <summary>
/// Der Arbeitsbaum als Sprungquelle: die Wurzel für den absoluten Pfad und ob die Stelle dort liegt. Die Produktiv-Implementierung
/// greift auf das Dateisystem zu; Tests setzen eine eigene Implementation.
/// </summary>
internal interface ISprungquelle
{
    string Repositorywurzel { get; }

    /// <summary>Ob die Datei im Arbeitsbaum liegt; ein Symlink, dessen Ziel aus der Wurzel hinausführt, ist <see cref="Sprungvorhandensein.VerlaesstWurzel"/>.</summary>
    Sprungvorhandensein PruefeVorhandensein(string absoluterPfad);
}
