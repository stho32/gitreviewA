using GitReviewA.Diff;
using GitReviewA.Git;

namespace GitReviewA.Zusammen;

/// <summary>
/// Die git-Zugriffe der Zusammen-Ansicht: Elternfolge der Auswahl, Netto-Änderungen der lückenlosen Kette und der Netto-Diff einer Datei.
/// Jeder Aufruf geht über <see cref="GitStart"/> (Schutzmaßnahmen der übrigen Lesepfade).
/// </summary>
internal interface IZusammenquelle
{
    Elternfolge Elternfolge();

    Dateiaenderungen NettoDateien(string basis, string spitze);

    string NettoDiff(string basis, string spitze, Dateiaenderung datei, Diffumfang umfang, Leerraum leerraum);
}
