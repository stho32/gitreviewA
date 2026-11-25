using GitReviewA.Git;

namespace GitReviewA.Sprung;

/// <summary>
/// Der Arbeitsbaum als Sprungquelle: die Wurzel für den absoluten Pfad, ob die Stelle dort liegt, und ob sie seit dem Commit
/// geändert wurde. Die Produktiv-Implementierung greift auf Dateisystem und git zu; Tests setzen eine eigene Implementation.
/// </summary>
internal interface ISprungquelle
{
    string Repositorywurzel { get; }

    /// <summary>Ob die Datei im Arbeitsbaum liegt; ein Symlink, dessen Ziel aus der Wurzel hinausführt, ist <see cref="Sprungvorhandensein.VerlaesstWurzel"/>.</summary>
    Sprungvorhandensein PruefeVorhandensein(string absoluterPfad);

    /// <summary>Ob der Arbeitsbaum an dieser Stelle vom Commit abweicht (`git diff --quiet`); ein Name mit Zeilenende ging nicht an git.</summary>
    bool IstGeaendertSeit(string hash, Dateiaenderung datei);
}
