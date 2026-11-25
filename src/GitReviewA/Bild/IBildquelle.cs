using GitReviewA.Git;

namespace GitReviewA.Bild;

/// <summary>
/// Ressourcenzugriff auf die Bytes einer Seite aus dem fremden Repo; wirft <see cref="GitFehler"/>. Hatte git mehr als die
/// Ausgabegrenze, kommen die ersten Bytes bis zur Grenze samt <see cref="Blobinhalt.UeberschritteneGrenze"/> — die Bildart kommt
/// aus den ersten Bytes, bevor die Größe zählt.
/// </summary>
internal interface IBildquelle
{
    Blobinhalt Lesen(string hash, Dateiaenderung datei, Bildseite seite);
}
