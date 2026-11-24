using GitReviewA.Fremdtext;
using GitReviewA.Git;

namespace GitReviewA.Haken;

/// <summary>
/// Alle Stellen der Auswahl: Commits in der Reihenfolge der Auswahl, je Commit die Dateien in der Reihenfolge von git, je Stelle ihr
/// Sperrgrund. Tragen zwei Dateien eines Commits denselben Namen, steht die Stelle zweimal da, beide Male gesperrt. Die per-Commit-Dateiliste
/// trägt Status, alten Pfad und Zeilenzahlen mit, damit die Netto-Liste ohne Kette keinen zweiten Lesevorgang je Commit braucht.
/// </summary>
internal sealed class Dateiuebersicht
{
    private readonly Stelle[] stellen;
    private readonly Dictionary<Stelle, string> sperrgrundNachStelle;
    private readonly Dictionary<Stelle, string> sperrgrundNachAngezeigtemNamen;
    private readonly HashSet<string> commits;
    private readonly string[] commitliste;
    private readonly Dictionary<string, Dateiaenderungen> dateienNachCommit;

    public Dateiuebersicht(IEnumerable<Commitdateien> commits, IEnumerable<Uebersichtsstelle> stellen)
    {
        var commitdateien = commits.ToArray();
        this.commits = new HashSet<string>(commitdateien.Select(commit => commit.Commit), StringComparer.Ordinal);
        commitliste = commitdateien.Select(commit => commit.Commit).ToArray();
        dateienNachCommit = [];
        foreach (var commit in commitdateien)
        {
            dateienNachCommit[commit.Commit] = commit.Dateien;
        }
        var eintraege = stellen.ToArray();
        this.stellen = eintraege.Select(eintrag => eintrag.Stelle).ToArray();
        sperrgrundNachStelle = [];
        sperrgrundNachAngezeigtemNamen = [];
        foreach (var eintrag in eintraege)
        {
            sperrgrundNachStelle[eintrag.Stelle] = eintrag.Sperrgrund;
            sperrgrundNachAngezeigtemNamen[Angezeigt(eintrag.Stelle)] = eintrag.Sperrgrund;
        }
    }

    public int Anzahl => stellen.Length;

    /// <summary>Die Commits der Auswahl in der Reihenfolge, in der die Übersicht sie gelesen hat.</summary>
    public IReadOnlyList<string> Commits => commitliste;

    /// <summary>Die Dateien eines Commits in der Reihenfolge von git; leer, wenn der Commit nicht zur Auswahl gehört oder leer ist.</summary>
    public Dateiaenderungen DateienDesCommits(string commit)
    {
        return dateienNachCommit.TryGetValue(commit, out var dateien) ? dateien : new Dateiaenderungen([]);
    }

    public bool Enthaelt(Stelle stelle)
    {
        return sperrgrundNachStelle.ContainsKey(stelle);
    }

    /// <summary>Leer, wenn der Diff der Stelle lesbar ist oder die Übersicht die Stelle nicht kennt.</summary>
    public string SperrgrundVon(Stelle stelle)
    {
        if (sperrgrundNachStelle.TryGetValue(stelle, out var sperrgrund) && sperrgrund is not null)
        {
            return sperrgrund;
        }
        if (sperrgrundNachAngezeigtemNamen.TryGetValue(Angezeigt(stelle), out var angezeigterSperrgrund) && angezeigterSperrgrund is not null)
        {
            return angezeigterSperrgrund;
        }
        return string.Empty;
    }

    public bool EnthaeltCommit(string hash)
    {
        return commits.Contains(hash);
    }

    public IEnumerator<Stelle> GetEnumerator()
    {
        return ((IEnumerable<Stelle>)stellen).GetEnumerator();
    }

    /// <summary>Derselbe Name, wie ihn das Ergebnis zeigt: Rohbytes als Marke, Steuerzeichen als `⟨U+XXXX⟩`.</summary>
    private static Stelle Angezeigt(Stelle stelle)
    {
        return stelle with { Pfad = UnsichtbareZeichen.AlsMarken(stelle.Pfad) };
    }
}
