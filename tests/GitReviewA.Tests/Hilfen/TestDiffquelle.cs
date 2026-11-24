using GitReviewA.Diff;
using GitReviewA.Git;

namespace GitReviewA.Tests.Hilfen;

/// <summary>
/// Liefert einen festen Patch (als Text gelesen: <c>textPatch</c>) und einen festen Grund für Binärdateien, merkt sich jede gelesene Datei;
/// ein Hash in <c>scheitertFuer</c> wirft wie git bei fehlendem Objekt.
/// </summary>
internal sealed class TestDiffquelle(string patch, string? scheitertFuer = null, string textPatch = "", string binaerGrund = Diffaufbereitung.GrundNullbytes) : IDiffquelle
{
    private readonly List<Dateiaenderung> gelesen = [];
    private readonly List<Dateiaenderung> alsTextGelesen = [];
    private readonly Lock sperre = new();

    public int Lesevorgaenge
    {
        get
        {
            lock (sperre)
            {
                return gelesen.Count;
            }
        }
    }

    public int TextLesevorgaenge
    {
        get
        {
            lock (sperre)
            {
                return alsTextGelesen.Count;
            }
        }
    }

    public Dateiaenderung? ZuletztGelesen
    {
        get
        {
            lock (sperre)
            {
                return gelesen.LastOrDefault();
            }
        }
    }

    public static TestDiffquelle Leer()
    {
        return new TestDiffquelle("");
    }

    public string Lesen(string hash, Dateiaenderung datei)
    {
        lock (sperre)
        {
            gelesen.Add(datei);
        }
        var scheitert = hash == scheitertFuer;
        if (scheitert)
        {
            throw new GitFehler($"git show {hash} -- {datei.Pfad} endete mit 128: fatal: bad object {hash}");
        }
        return patch;
    }

    public string AlsTextLesen(string hash, Dateiaenderung datei)
    {
        lock (sperre)
        {
            alsTextGelesen.Add(datei);
        }
        return textPatch;
    }

    public string BinaerGrund(string hash, Dateiaenderung datei)
    {
        return binaerGrund;
    }
}
