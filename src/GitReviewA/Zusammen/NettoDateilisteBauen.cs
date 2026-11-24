using GitReviewA.Aufruf;
using GitReviewA.Fremdtext;
using GitReviewA.Git;
using GitReviewA.Haken;

namespace GitReviewA.Zusammen;

/// <summary>
/// Setzt die Netto-Dateiliste zusammen: bei lückenloser Kette aus den Netto-Änderungen (jede Datei einmal, die Zahlen netto gegen den
/// Elternstand), sonst aus der Vereinigung der per-Commit-Dateilisten — jeder Rohname einmal, die Zahlen als Summe der Abschnitte.
/// Die Stellen jeder Datei bleiben in Aufrufreihenfolge; der zuständige Commit ist der jüngste der Auswahl, der die Datei ändert.
/// Umbenennungen verketten die Namen (der alte Pfad gehört zur selben Datei).
/// </summary>
internal static class NettoDateilisteBauen
{
    public static NettoDateiliste Baue(Kette kette, Dateiaenderungen netto, Dateiuebersicht uebersicht, CommitHashes juengsteZuerst)
    {
        var gruppen = Namensgruppen.Aus(uebersicht, kette.Reihenfolge);
        if (kette.Lueckenlos)
        {
            return new NettoDateiliste(true, Lueckenlos(netto, gruppen, juengsteZuerst));
        }
        return new NettoDateiliste(false, Vereinigung(gruppen, juengsteZuerst));
    }

    private static List<NettoDatei> Lueckenlos(Dateiaenderungen netto, Namensgruppen gruppen, CommitHashes juengsteZuerst)
    {
        var dateien = new List<NettoDatei>(netto.Anzahl);
        foreach (var datei in netto)
        {
            var stellen = gruppen.StellenZu(datei);
            var neueste = Neueste(stellen, juengsteZuerst);
            dateien.Add(new NettoDatei(datei, stellen, neueste.Commit));
        }
        return dateien;
    }

    private static List<NettoDatei> Vereinigung(Namensgruppen gruppen, CommitHashes juengsteZuerst)
    {
        var dateien = new List<NettoDatei>();
        foreach (var stellen in gruppen.InReihenfolgeErsterErscheinung())
        {
            var neueste = Neueste(stellen, juengsteZuerst);
            dateien.Add(new NettoDatei(Zusammengefasst(stellen, neueste), stellen, neueste.Commit));
        }
        return dateien;
    }

    /// <summary>Ohne Kette die Summe der Abschnitte (dieselben Zahlen, die der Diff je Commit zeigt) — keine Netto-Rechnung.</summary>
    private static Dateiaenderung Zusammengefasst(NettoStelle[] stellen, NettoStelle neueste)
    {
        var istBinaer = stellen.Any(stelle => stelle.Datei.Plus is null || stelle.Datei.Minus is null);
        int? plus = istBinaer ? null : stellen.Sum(stelle => stelle.Datei.Plus);
        int? minus = istBinaer ? null : stellen.Sum(stelle => stelle.Datei.Minus);
        var alterPfad = AlterPfad(stellen, neueste);
        return new Dateiaenderung(neueste.Datei.Status, neueste.Datei.Pfad, alterPfad, plus, minus, neueste.Datei.Rohpfad, RohAlterPfad(stellen, alterPfad));
    }

    /// <summary>Der älteste Namen einer Umbenennung, damit die zusammengefasste Sicht den alten Pfad nicht verliert.</summary>
    private static string? AlterPfad(NettoStelle[] stellen, NettoStelle neueste)
    {
        var umbenennung = neueste.Datei.AlterPfad;
        if (umbenennung is not null)
        {
            return umbenennung;
        }
        foreach (var stelle in stellen)
        {
            if (stelle.Datei.Pfad != neueste.Datei.Pfad)
            {
                return stelle.Datei.Pfad;
            }
        }
        return null;
    }

    private static Rohname? RohAlterPfad(NettoStelle[] stellen, string? alterPfad)
    {
        if (alterPfad is null)
        {
            return null;
        }
        foreach (var stelle in stellen)
        {
            if (stelle.Datei.Pfad == alterPfad)
            {
                return stelle.Datei.Rohpfad;
            }
        }
        return null;
    }

    private static NettoStelle Neueste(NettoStelle[] stellen, CommitHashes juengsteZuerst)
    {
        var rang = RangNachCommit(juengsteZuerst);
        return stellen.OrderBy(stelle => rang.TryGetValue(stelle.Commit, out var platz) ? platz : int.MaxValue).First();
    }

    private static Dictionary<string, int> RangNachCommit(CommitHashes juengsteZuerst)
    {
        var rang = new Dictionary<string, int>(StringComparer.Ordinal);
        var platz = 0;
        foreach (var hash in juengsteZuerst)
        {
            rang.TryAdd(hash, platz);
            platz++;
        }
        return rang;
    }

    /// <summary>Die Stellen je Rohname, über Umbenennungen verkettet; zwei Doppelgänger-Namen bleiben getrennt.</summary>
    private sealed class Namensgruppen
    {
        private readonly Dictionary<Rohname, List<NettoStelle>> stellenNachJedemNamen = [];
        private readonly List<List<NettoStelle>> gruppen = [];

        public static Namensgruppen Aus(Dateiuebersicht uebersicht, CommitHashes auswahl)
        {
            var erlaubt = new HashSet<string>(StringComparer.Ordinal);
            foreach (var hash in auswahl)
            {
                erlaubt.Add(hash);
            }
            var namensgruppen = new Namensgruppen();
            foreach (var commit in uebersicht.Commits)
            {
                if (!erlaubt.Contains(commit))
                {
                    continue;
                }
                foreach (var datei in uebersicht.DateienDesCommits(commit))
                {
                    namensgruppen.Fuege(commit, datei);
                }
            }
            return namensgruppen;
        }

        public NettoStelle[] StellenZu(Dateiaenderung netto)
        {
            var namen = new[] { Schluessel(netto.Pfad, netto.Rohpfad) };
            foreach (var name in namen)
            {
                if (stellenNachJedemNamen.TryGetValue(name, out var stellen))
                {
                    return stellen.ToArray();
                }
            }
            var alterName = netto.AlterPfad is null ? null : Schluessel(netto.AlterPfad, netto.RohAlterPfad);
            if (alterName is not null && stellenNachJedemNamen.TryGetValue(alterName, out var ueberAltenNamen))
            {
                return ueberAltenNamen.ToArray();
            }
            throw new GitFehler($"Die Netto-Liste nennt die Datei {netto.Pfad}, die Dateiübersicht kennt sie nicht");
        }

        public List<NettoStelle[]> InReihenfolgeErsterErscheinung()
        {
            return gruppen.Select(gruppe => gruppe.ToArray()).ToList();
        }

        private void Fuege(string commit, Dateiaenderung datei)
        {
            var name = Schluessel(datei.Pfad, datei.Rohpfad);
            var gruppe = GruppeZu(name, datei);
            gruppe.Add(new NettoStelle(commit, datei));
            stellenNachJedemNamen[name] = gruppe;
            if (datei.AlterPfad is not null)
            {
                stellenNachJedemNamen[Schluessel(datei.AlterPfad, datei.RohAlterPfad)] = gruppe;
            }
        }

        /// <summary>Findet die Gruppe über den neuen oder den alten Namen; sonst eine neue, die in Erscheinungsreihenfolge angelegt wird.</summary>
        private List<NettoStelle> GruppeZu(Rohname name, Dateiaenderung datei)
        {
            if (stellenNachJedemNamen.TryGetValue(name, out var bekannt))
            {
                return bekannt;
            }
            if (datei.AlterPfad is not null && stellenNachJedemNamen.TryGetValue(Schluessel(datei.AlterPfad, datei.RohAlterPfad), out var ueberAltenNamen))
            {
                return ueberAltenNamen;
            }
            var neue = new List<NettoStelle>();
            gruppen.Add(neue);
            return neue;
        }

        private static Rohname Schluessel(string pfad, Rohname? rohname)
        {
            return rohname ?? new Rohname(System.Text.Encoding.UTF8.GetBytes(pfad));
        }
    }
}
