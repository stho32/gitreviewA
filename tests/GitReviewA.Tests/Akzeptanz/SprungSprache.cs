using GitReviewA.Sprung;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Testsprache „In VS Code springen“ (R00021): Commits heißen wie in der User Story (`s1`, `s2`, `l`, `f`), das erwartete Ziel baut
/// der Test aus der Wurzel und dem Pfad. Darunter der Treiber, der den Interactor in-process gegen echtes git ruft.
/// </summary>
internal sealed class SprungSprache
{
    private readonly SprungTreiber treiber;
    private readonly Dictionary<string, string> hashNachName;
    private readonly Dictionary<string, string> nameNachHash;

    private SprungSprache(SprungTreiber treiber, Func<string, string> hash, string[] commits)
    {
        this.treiber = treiber;
        hashNachName = commits.ToDictionary(commit => commit, hash);
        nameNachHash = commits.ToDictionary(hash, commit => commit);
    }

    /// <summary>`gitreviewA <commits…>` in der Wurzel des Repos.</summary>
    public static SprungSprache Aufruf(string ordner, Func<string, string> hash, params string[] commits)
    {
        return new SprungSprache(SprungTreiber.Starten(ordner, commits.Select(hash)), hash, commits);
    }

    /// <summary>Wie ein Commit-Name; alles andere (etwa `HEAD`) geht wörtlich als Hash an den Interactor.</summary>
    public Sprungbild Sprung(string commitOderHash, string pfad)
    {
        return BildFuer(treiber.Sprung(HashOderWort(commitOderHash), pfad));
    }

    public int Arbeitsbaumpruefungen => treiber.Arbeitsbaumpruefungen;

    public string[] Protokollzeilen()
    {
        return treiber.Protokollzeilen();
    }

    public string Name(string hash)
    {
        return nameNachHash.TryGetValue(hash, out var name) ? name : hash;
    }

    private string HashOderWort(string commitOderHash)
    {
        return hashNachName.TryGetValue(commitOderHash, out var hash) ? hash : commitOderHash;
    }

    private static Sprungbild BildFuer(Sprungergebnis ergebnis)
    {
        return new Sprungbild(AusgangAlsWort(ergebnis.Ausgang), ergebnis.Ziel, ergebnis.Geaendert, ergebnis.Grund);
    }

    private static string AusgangAlsWort(Sprungausgang ausgang)
    {
        switch (ausgang)
        {
            case Sprungausgang.Beantwortet:
                return "beantwortet";
            case Sprungausgang.NichtGefunden:
                return "nicht gefunden";
            default:
                return "nicht lesbar";
        }
    }
}

/// <summary>Die Antwort in Testwörtern: Ausgang, Ziel, Kennzeichen „geändert“ und Grund.</summary>
internal sealed record Sprungbild(string Ausgang, string Ziel, bool Geaendert, string Grund);
