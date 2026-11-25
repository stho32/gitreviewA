namespace GitReviewA.Bild;

/// <summary>Die gelesene Seite: der am Inhalt erkannte Typ und die Bytes. Der Typ kommt nie aus dem Repo.</summary>
internal sealed record Bildantwort(Bildart Art, byte[] Bytes);
