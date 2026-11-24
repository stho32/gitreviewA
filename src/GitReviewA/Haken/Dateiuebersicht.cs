using GitReviewA.Fremdtext;

namespace GitReviewA.Haken;

/// <summary>
/// Alle Stellen der Auswahl: Commits in der Reihenfolge der Auswahl, je Commit die Dateien in der Reihenfolge von git, je Stelle ihr
/// Sperrgrund. Tragen zwei Dateien eines Commits denselben Namen, steht die Stelle zweimal da, beide Male gesperrt.
/// </summary>
internal sealed class Dateiuebersicht
{
    private readonly Stelle[] stellen;
    private readonly Dictionary<Stelle, string> sperrgrundNachStelle;
    private readonly Dictionary<Stelle, string> sperrgrundNachAngezeigtemNamen;
    private readonly HashSet<string> commits;

    public Dateiuebersicht(IEnumerable<string> commits, IEnumerable<Uebersichtsstelle> stellen)
    {
        this.commits = new HashSet<string>(commits, StringComparer.Ordinal);
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
