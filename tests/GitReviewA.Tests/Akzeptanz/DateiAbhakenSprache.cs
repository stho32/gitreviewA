using System.Runtime.Versioning;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Testsprache „Datei abhaken“ (R00011): Commits heißen wie in der User Story, „abhaken“ setzt den Haken einer Stelle (Commit und Datei),
/// „Haken wegnehmen“ entnimmt ihn. Darunter der Treiber, der den Interactor in-process ruft.
/// </summary>
[UnsupportedOSPlatform("windows")]
internal sealed class DateiAbhakenSprache
{
    private readonly AbhakenRepo repo;
    private readonly DateiAbhakenTreiber treiber;

    private DateiAbhakenSprache(AbhakenRepo repo, DateiAbhakenTreiber treiber)
    {
        this.repo = repo;
        this.treiber = treiber;
    }

    /// <summary>`gitreviewA <commits…>` im Repo, gestartet im Ordner <paramref name="unterordner"/> des Repos (Standard: Wurzel).</summary>
    public static DateiAbhakenSprache Aufruf(AbhakenRepo repo, string[] commits, string unterordner = "")
    {
        var startordner = Path.Combine(repo.Ordner, unterordner);
        var treiber = DateiAbhakenTreiber.Starten(startordner, commits.Select(repo.Hash));
        return new DateiAbhakenSprache(repo, treiber);
    }

    public Hakenantwort Hake(string commit, string datei)
    {
        return treiber.Setze(repo.Hash(commit), datei, true);
    }

    public Hakenantwort NimmHakenWeg(string commit, string datei)
    {
        return treiber.Setze(repo.Hash(commit), datei, false);
    }

    public Hakenantwort HakeMitHash(string hash, string datei)
    {
        return treiber.Setze(hash, datei, true);
    }

    /// <summary>„n von m abgehakt“ aus dem gelesenen Stand.</summary>
    public string Fortschritt()
    {
        var stand = treiber.Stand();
        return $"{stand.Abgehakt} von {stand.Gesamt} abgehakt";
    }

    public bool IstAbgehakt(string commit, string datei)
    {
        var hash = repo.Hash(commit);
        return treiber.Stand().Stellen.Single(stelle => stelle.Commit == hash && stelle.Datei == datei).Abgehakt;
    }

    /// <summary>Die Stellen des Standes als „Commitname:Pfad“, in der Reihenfolge des Standes.</summary>
    public string[] Stellen(params string[] commits)
    {
        var nameNachHash = commits.ToDictionary(repo.Hash, commit => commit);
        return treiber.Stand().Stellen.Select(stelle => $"{nameNachHash[stelle.Commit]}:{stelle.Datei}").ToArray();
    }

    public string Beenden()
    {
        return treiber.Beenden();
    }

    /// <summary>Eine Zeile des Abschnitts „Dateien“: `- <Pfad> (Commit <voller Hash>)`.</summary>
    public string Ergebniszeile(string commit, string pfad)
    {
        return $"- {pfad} (Commit {repo.Hash(commit)})";
    }

    public int Uebersichtslesungen()
    {
        return treiber.Uebersichtslesungen();
    }

    public string[] Protokollzeilen()
    {
        return treiber.Protokoll().Split('\n', StringSplitOptions.RemoveEmptyEntries);
    }
}
