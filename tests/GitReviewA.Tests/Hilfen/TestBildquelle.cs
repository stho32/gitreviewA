using GitReviewA.Bild;
using GitReviewA.Git;

namespace GitReviewA.Tests.Hilfen;

/// <summary>Liefert feste Bytes je Pfad und Seite, zählt die Lesevorgänge; ein Pfad in <c>zuGrossFuer</c> kam abgeschnitten an der
/// Grenze zurück (die Bytes sind sein Anfang), ein Pfad in <c>scheitertFuer</c> wirft wie git.</summary>
internal sealed class TestBildquelle : IBildquelle
{
    private readonly Dictionary<string, byte[]> bytesNachStelle = new(StringComparer.Ordinal);
    private string? zuGrossFuer;
    private long zuGrossGrenze;
    private string? scheitertFuer;
    private int lesevorgaenge;

    public int Lesevorgaenge => lesevorgaenge;

    public TestBildquelle Mit(string pfad, Bildseite seite, byte[] bytes)
    {
        bytesNachStelle[Stelle(pfad, seite)] = bytes;
        return this;
    }

    /// <summary>Der Blob dieses Pfads hatte mehr als <paramref name="grenze"/> Byte: es kommt der Anfang bis zur Grenze zurück.</summary>
    public TestBildquelle ZuGrossFuer(string pfad, long grenze)
    {
        zuGrossFuer = pfad;
        zuGrossGrenze = grenze;
        return this;
    }

    public TestBildquelle ScheitertFuer(string pfad)
    {
        scheitertFuer = pfad;
        return this;
    }

    public Blobinhalt Lesen(string hash, Dateiaenderung datei, Bildseite seite)
    {
        Interlocked.Increment(ref lesevorgaenge);
        if (datei.Pfad == scheitertFuer)
        {
            throw new GitFehler($"git cat-file endete mit 128: fatal: bad object");
        }
        var bekannt = bytesNachStelle.TryGetValue(Stelle(datei.Pfad, seite), out var bytes);
        if (!bekannt || bytes is null)
        {
            throw new GitFehler("git cat-file endete mit 128: fatal: path does not exist");
        }
        if (datei.Pfad == zuGrossFuer)
        {
            return new Blobinhalt(bytes, new Ausgabegrenze(zuGrossGrenze));
        }
        return new Blobinhalt(bytes, null);
    }

    private static string Stelle(string pfad, Bildseite seite)
    {
        return $"{seite}|{pfad}";
    }
}
