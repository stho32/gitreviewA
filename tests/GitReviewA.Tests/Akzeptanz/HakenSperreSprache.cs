using System.Runtime.Versioning;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Testsprache „Haken und Anmerkung bei nicht lesbarem Diff sperren“ (R00014): Commits heißen wie in der User Story (`n`, `v`), Namen wie
/// in der Dateiliste. Darunter der Treiber, der die Interactors in-process ruft.
/// </summary>
[UnsupportedOSPlatform("windows")]
internal sealed class HakenSperreSprache
{
    private readonly FremdeNamenRepo repo;
    private readonly HakenSperreTreiber treiber;
    private readonly Dictionary<string, string> nameNachHash;

    private HakenSperreSprache(FremdeNamenRepo repo, HakenSperreTreiber treiber, string[] commits)
    {
        this.repo = repo;
        this.treiber = treiber;
        nameNachHash = commits.ToDictionary(repo.Hash, commit => commit);
    }

    /// <summary>`gitreviewA <commits…>` in der Wurzel des Repos.</summary>
    public static HakenSperreSprache Aufruf(FremdeNamenRepo repo, params string[] commits)
    {
        var treiber = HakenSperreTreiber.Starten(repo.Ordner, commits.Select(repo.Hash));
        return new HakenSperreSprache(repo, treiber, commits);
    }

    public Hakenantwort Hake(string commit, string datei)
    {
        return treiber.Setze(repo.Hash(commit), datei, true);
    }

    public Hakenantwort NimmHakenWeg(string commit, string datei)
    {
        return treiber.Setze(repo.Hash(commit), datei, false);
    }

    /// <summary>„n von m abgehakt“ aus dem gelesenen Stand.</summary>
    public string Fortschritt()
    {
        var stand = treiber.Stand();
        return $"{stand.Abgehakt} von {stand.Gesamt} abgehakt";
    }

    /// <summary>Die Stellen des Standes als „Commitname:Pfad|Sperrgrund“ in der Reihenfolge des Standes (Sperrgrund leer, wenn lesbar).</summary>
    public string[] StellenMitSperrgrund()
    {
        return treiber.Stand().Stellen.Select(stelle => $"{nameNachHash[stelle.Commit]}:{stelle.Datei}|{stelle.Sperrgrund}").ToArray();
    }

    public (int Abgehakt, int Gesamt) Zaehlung()
    {
        var stand = treiber.Stand();
        return (stand.Abgehakt, stand.Gesamt);
    }

    public Dateiansicht Diff(string commit, string datei)
    {
        return treiber.Diff(repo.Hash(commit), datei);
    }

    public string Beenden()
    {
        return treiber.Beenden();
    }

    public string Hash(string commit)
    {
        return repo.Hash(commit);
    }

    public string[] Protokollzeilen()
    {
        return treiber.Protokollzeilen();
    }
}
