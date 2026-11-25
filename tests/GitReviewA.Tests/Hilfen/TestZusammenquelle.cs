using GitReviewA.Diff;
using GitReviewA.Git;
using GitReviewA.Zusammen;

namespace GitReviewA.Tests.Hilfen;

/// <summary>
/// Feste Zusammen-Quelle für Endpunkttests: die Elternfolge, die Netto-Änderungen und einen festen Netto-Patch; auf Wunsch scheitern
/// die Netto-Änderungen wie git bei fehlendem Objekt. Zählt die Netto-Diff-Lesevorgänge.
/// </summary>
internal sealed class TestZusammenquelle : IZusammenquelle
{
    private readonly List<string> nettoDiffs = [];

    public Elternfolge GegebeneElternfolge { get; set; } = new([]);

    public Dateiaenderungen GegebeneNetto { get; set; } = new([]);

    public string Patch { get; set; } = "";

    public bool ScheitertBeiNetto { get; set; }

    public int NettoDiffLesevorgaenge => nettoDiffs.Count;

    public int NettoLesevorgaenge { get; private set; }

    public Diffumfang? ZuletztUmfang { get; private set; }

    /// <summary>Die Leerraum-Stellung des letzten Netto-Diffs; `null` ohne einen (R00026, Nacharbeit I0027).</summary>
    public Leerraum? ZuletztLeerraum { get; private set; }

    public static TestZusammenquelle Leer()
    {
        return new TestZusammenquelle();
    }

    public Elternfolge Elternfolge()
    {
        return GegebeneElternfolge;
    }

    public Dateiaenderungen NettoDateien(string basis, string spitze)
    {
        NettoLesevorgaenge++;
        if (ScheitertBeiNetto)
        {
            throw new GitFehler($"git diff (Netto {basis}..{spitze}) endete mit 128: fatal: bad object");
        }
        return GegebeneNetto;
    }

    public string NettoDiff(string basis, string spitze, Dateiaenderung datei, Diffumfang umfang, Leerraum leerraum)
    {
        nettoDiffs.Add(datei.Pfad);
        ZuletztUmfang = umfang;
        ZuletztLeerraum = leerraum;
        return Patch;
    }
}
