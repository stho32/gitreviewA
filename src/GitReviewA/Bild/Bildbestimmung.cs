namespace GitReviewA.Bild;

/// <summary>
/// Erkennt am Anfang des Inhalts (Magic Bytes) einen der vier festen Bildtypen; die Endung ist nur ein Hinweis.
/// Kein Treffer heißt kein Bild — SVG und eine Textdatei mit `.png`-Endung sind keine. Gelesen wird nur der Anfang,
/// nie die ganze Datei.
/// </summary>
internal static class Bildbestimmung
{
    private static readonly byte[] PngKennung = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    private static readonly byte[] JpegKennung = [0xFF, 0xD8, 0xFF];
    private static readonly byte[] GifKennung = [0x47, 0x49, 0x46, 0x38];
    private static readonly byte[] RiffKennung = [0x52, 0x49, 0x46, 0x46];
    private static readonly byte[] WebpKennung = [0x57, 0x45, 0x42, 0x50];
    private const int WebpKennungStelle = 8;

    public static Bildart? Art(ReadOnlySpan<byte> anfang)
    {
        if (BeginntMit(anfang, PngKennung))
        {
            return Bildart.Png;
        }
        if (BeginntMit(anfang, JpegKennung))
        {
            return Bildart.Jpeg;
        }
        if (BeginntMit(anfang, GifKennung))
        {
            return Bildart.Gif;
        }
        var istWebp = BeginntMit(anfang, RiffKennung) && BeginntMit(anfang[WebpKennungStelle..], WebpKennung);
        if (istWebp)
        {
            return Bildart.Webp;
        }
        return null;
    }

    private static bool BeginntMit(ReadOnlySpan<byte> inhalt, ReadOnlySpan<byte> kennung)
    {
        var istLangGenug = inhalt.Length >= kennung.Length;
        if (!istLangGenug)
        {
            return false;
        }
        return inhalt[..kennung.Length].SequenceEqual(kennung);
    }
}
