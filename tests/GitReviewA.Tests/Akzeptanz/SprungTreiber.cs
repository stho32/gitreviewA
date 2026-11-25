using GitReviewA.Aufruf;
using GitReviewA.Dateien;
using GitReviewA.Git;
using GitReviewA.Protokoll;
using GitReviewA.Sprung;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Treiber in-process für R00021: verdrahtet den <see cref="SprungInteractor"/> wie der Programmstart (echtes git in der Wurzel des
/// Startordners, eine gemerkte Dateiliste, Protokoll auf Stufe Debug) und zählt die Arbeitsbaumprüfungen — so belegt „kein git-Aufruf“
/// sich als Null. Kennt als einziger die Typen der Sprung-Schicht.
/// </summary>
internal sealed class SprungTreiber
{
    private readonly SprungInteractor interactor;
    private readonly ZaehlendeSprungquelle quelle;
    private readonly StringWriter protokollziel;

    private SprungTreiber(SprungInteractor interactor, ZaehlendeSprungquelle quelle, StringWriter protokollziel)
    {
        this.interactor = interactor;
        this.quelle = quelle;
        this.protokollziel = protokollziel;
    }

    public static SprungTreiber Starten(string startordner, IEnumerable<string> hashes)
    {
        return Starten(startordner, hashes, Ausgabegrenze.Standard);
    }

    public static SprungTreiber Starten(string startordner, IEnumerable<string> hashes, Ausgabegrenze grenze)
    {
        var commits = GitLeser.Lesen(new CommitHashes(hashes), startordner);
        var wurzel = GitLeser.WurzelLesen(startordner);
        var protokollziel = new StringWriter();
        var protokoll = new StderrProtokoll(protokollziel, TimeProvider.System, Protokollstufe.Debug);
        var dateien = new GemerkteDateiquelle(new GitDateiquelle(wurzel));
        var quelle = new ZaehlendeSprungquelle(new GitSprungquelle(wurzel, grenze));
        var interactor = new SprungInteractor(commits, dateien, quelle, protokoll);
        return new SprungTreiber(interactor, quelle, protokollziel);
    }

    public Sprungergebnis Sprung(string hash, string pfad)
    {
        return interactor.Lesen(new Sprunganfrage(hash, pfad));
    }

    public int Arbeitsbaumpruefungen => quelle.Arbeitsbaumpruefungen;

    public string[] Protokollzeilen()
    {
        return protokollziel.ToString().Split('\n', StringSplitOptions.RemoveEmptyEntries);
    }

    private sealed class ZaehlendeSprungquelle(ISprungquelle innere) : ISprungquelle
    {
        public string Repositorywurzel => innere.Repositorywurzel;

        public int Arbeitsbaumpruefungen { get; private set; }

        public Sprungvorhandensein PruefeVorhandensein(string absoluterPfad)
        {
            return innere.PruefeVorhandensein(absoluterPfad);
        }

        public bool IstGeaendertSeit(string hash, Dateiaenderung datei)
        {
            Arbeitsbaumpruefungen++;
            return innere.IstGeaendertSeit(hash, datei);
        }
    }
}
