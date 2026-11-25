namespace GitReviewA.Git;

/// <summary>
/// Die gelesenen Bytes eines Blobs und, wenn git mehr hatte, die überschrittene Ausgabegrenze: dann sind <see cref="Bytes"/> der
/// Anfang bis zur Grenze. Gekürzt wird nie still um des Kürzens willen — der Aufrufer entscheidet, was der Anfang bedeutet
/// (die Bildart kommt aus den ersten Bytes, bevor die Größe zählt).
/// </summary>
internal sealed record Blobinhalt(byte[] Bytes, Ausgabegrenze? UeberschritteneGrenze);
