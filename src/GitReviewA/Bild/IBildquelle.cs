using GitReviewA.Git;

namespace GitReviewA.Bild;

/// <summary>Ressourcenzugriff auf die Bytes einer Seite aus dem fremden Repo; wirft <see cref="GitZuGross"/> bzw. <see cref="GitFehler"/>.</summary>
internal interface IBildquelle
{
    byte[] Lesen(string hash, Dateiaenderung datei, Bildseite seite);
}
