using GitReviewA.Aufruf;

namespace GitReviewA.Zusammen;

/// <summary>
/// Beurteilt rein, ob die Auswahl eine lückenlose Kette bildet (Definition des product-owner 2026-11-24, Protokoll Zeile 81):
/// unabhängig von der Reihenfolge im Aufruf ein durchgehender Pfad über erste Elternteile. Ein einzelner Commit ist lückenlos,
/// seine Basis ist sein Elternstand (leer nur, wenn er eine Wurzel ist). Mehrere älteste Commits, ein Commit mit zwei Nachfolgern
/// in der Auswahl oder ein fehlendes Glied ergeben „nicht lückenlos“.
/// </summary>
internal static class KetteBeurteilen
{
    public static Kette Beurteile(Elternfolge folge, CommitHashes auswahl)
    {
        var eltern = ElternNachCommit(folge);
        var gewaehlt = OhneWiederholung(auswahl);
        var kette = KetteOderNull(eltern, gewaehlt);
        if (kette is null)
        {
            return Kette.NichtLueckenlos(gewaehlt);
        }
        return new Kette(true, Elternteil(eltern, kette[0]), new CommitHashes(kette));
    }

    private static Dictionary<string, string> ElternNachCommit(Elternfolge folge)
    {
        var eltern = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var zeile in folge)
        {
            eltern.TryAdd(zeile.Commit, zeile.Eltern);
        }
        return eltern;
    }

    private static List<string> OhneWiederholung(CommitHashes auswahl)
    {
        var gesehen = new HashSet<string>(StringComparer.Ordinal);
        var gewaehlt = new List<string>(auswahl.Anzahl);
        foreach (var hash in auswahl)
        {
            if (gesehen.Add(hash))
            {
                gewaehlt.Add(hash);
            }
        }
        return gewaehlt;
    }

    /// <summary>Ältester zuerst; null, wenn kein einzelner ältester Commit existiert, ein Commit zwei Nachfolger hat oder ein Glied fehlt.</summary>
    private static List<string>? KetteOderNull(Dictionary<string, string> eltern, List<string> gewaehlt)
    {
        var gewaehltSet = new HashSet<string>(gewaehlt, StringComparer.Ordinal);
        var aelteste = gewaehlt.Where(commit => !gewaehltSet.Contains(Elternteil(eltern, commit))).ToList();
        if (aelteste.Count != 1)
        {
            return null;
        }
        var kette = new List<string>(gewaehlt.Count) { aelteste[0] };
        while (kette.Count < gewaehlt.Count)
        {
            var aktuelle = kette[^1];
            var nachfolger = gewaehlt.Where(commit => Elternteil(eltern, commit) == aktuelle).ToList();
            if (nachfolger.Count != 1)
            {
                return null;
            }
            kette.Add(nachfolger[0]);
        }
        return kette;
    }

    private static string Elternteil(Dictionary<string, string> eltern, string commit)
    {
        return eltern.TryGetValue(commit, out var elternteil) ? elternteil : string.Empty;
    }
}
