namespace GitReviewA.Bild;

/// <summary>Welche Fassung einer Datei gelesen wird: der erste Elternteil des Commits (`vorher`) oder der Commit selbst (`nachher`).</summary>
internal enum Bildseite
{
    Vorher,
    Nachher,
}
