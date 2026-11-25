namespace GitReviewA.Bild;

/// <summary>
/// Die vier festen Bildtypen. Der Typ kommt nie aus dem Repo, sondern nur aus dem Inhalt (Magic Bytes);
/// SVG ist nie ein Bild, weil es Text mit Skriptanteil ist.
/// </summary>
internal enum Bildart
{
    Png,
    Jpeg,
    Gif,
    Webp,
}
