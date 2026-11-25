using GitReviewA.Git;
using GitReviewA.Sprung;

namespace GitReviewA.Tests.Hilfen;

/// <summary>
/// Feste Sprungquelle für Interactor- und Endpunkttests: Wurzel, Vorhandensein je absolutem Pfad (Standard <c>Vorhanden</c>) und
/// geändert je Stelle. Zählt die Prüfungen des Arbeitsbaums — so belegt „kein git-Aufruf“ sich als Null.
/// </summary>
internal sealed class TestSprungquelle(string repositorywurzel) : ISprungquelle
{
    private readonly Dictionary<string, Sprungvorhandensein> vorhandenNachPfad = new(StringComparer.Ordinal);
    private readonly HashSet<string> geaenderteStellen = new(StringComparer.Ordinal);

    public string Repositorywurzel { get; } = repositorywurzel;

    public int Arbeitsbaumpruefungen { get; private set; }

    public bool ScheitertBeiArbeitsbaumpruefung { get; set; }

    public TestSprungquelle SetzeVorhanden(string absoluterPfad, Sprungvorhandensein vorhanden)
    {
        vorhandenNachPfad[absoluterPfad] = vorhanden;
        return this;
    }

    public TestSprungquelle SetzeGeaendert(string hash, string pfad)
    {
        geaenderteStellen.Add(Stelle(hash, pfad));
        return this;
    }

    public Sprungvorhandensein PruefeVorhandensein(string absoluterPfad)
    {
        var istGesetzt = vorhandenNachPfad.TryGetValue(absoluterPfad, out var vorhanden);
        if (!istGesetzt)
        {
            return Sprungvorhandensein.Vorhanden;
        }
        return vorhanden;
    }

    public bool IstGeaendertSeit(string hash, Dateiaenderung datei)
    {
        Arbeitsbaumpruefungen++;
        if (ScheitertBeiArbeitsbaumpruefung)
        {
            throw new GitFehler($"git diff --quiet {hash} -- {datei.Pfad} endete mit 128");
        }
        return geaenderteStellen.Contains(Stelle(hash, datei.Pfad));
    }

    private static string Stelle(string hash, string pfad)
    {
        return $"{hash} {pfad}";
    }
}
