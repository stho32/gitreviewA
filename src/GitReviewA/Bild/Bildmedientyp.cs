namespace GitReviewA.Bild;

/// <summary>Der feste HTTP-Inhaltstyp je Bildart; er kommt nie aus dem Repo.</summary>
internal static class Bildmedientyp
{
    private const string Png = "image/png";
    private const string Jpeg = "image/jpeg";
    private const string Gif = "image/gif";
    private const string Webp = "image/webp";

    public static string Fuer(Bildart art)
    {
        switch (art)
        {
            case Bildart.Png:
                return Png;
            case Bildart.Jpeg:
                return Jpeg;
            case Bildart.Gif:
                return Gif;
            case Bildart.Webp:
                return Webp;
            default:
                throw new ArgumentOutOfRangeException(nameof(art), art, "Unbekannte Bildart");
        }
    }
}
