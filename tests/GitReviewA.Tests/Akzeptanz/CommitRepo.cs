using System.Runtime.Versioning;
using System.Text;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Die Wegwerf-Repos der User Story zu R00048 (Karte #60), mit den Commits unter ihren Namen aus der Story:
/// **Repo F** (`p` Start, `t` mit 0x1F in Autor/Betreff/Rumpf, `u` mit 0x1E, `z` mit NUL in der Message, `n` mit NUL im Autorkopf,
/// `g` mit 9 MiB Message, `h`/`i` mit 20 MiB + 6 MiB), **Repo W** (`p`, `w` mit 200 Dateien, `m` Merge mit 120 Eltern),
/// **Repo E** (Umkodierung UTF-16LE, UTF-7, ISO-8859-1) und **Repo L** (3 000 Commits mit je 3 KiB Message).
/// Die Zeiten stammen aus der Story, damit Datum und Reihenfolge prüfbar sind.
/// </summary>
[UnsupportedOSPlatform("windows")]
internal sealed class CommitRepo : IDisposable
{
    private const string ZeitP = "2026-03-03T08:00:00+01:00";
    private const string ZeitT = "2026-03-04T09:15:00+01:00";
    private const string ZeitU = "2026-03-05T18:30:00+01:00";
    private const string ZeitZ = "2026-03-05T09:40:00+01:00";
    private const string ZeitN = "2026-03-06T00:00:00+01:00";
    private const string ZeitG = "2026-03-06T10:00:00+01:00";
    private const string ZeitH = "2026-03-06T10:01:00+01:00";
    private const string ZeitI = "2026-03-06T10:02:00+01:00";

    private const long MessageNeunMiB = 9L * 1024 * 1024;
    private const long MessageZwanzigMiB = 20L * 1024 * 1024;
    private const long MessageSechsMiB = 6L * 1024 * 1024;

    private readonly WegwerfRepo repo;
    private readonly Dictionary<string, string> hashNachName = new(StringComparer.Ordinal);

    private CommitRepo(WegwerfRepo repo)
    {
        this.repo = repo;
    }

    public string Ordner => repo.Ordner;

    public string Hash(string commit)
    {
        return hashNachName[commit];
    }

    public string Git(params string[] argumente)
    {
        return repo.Git(argumente);
    }

    public void Dispose()
    {
        repo.Dispose();
    }

    public static CommitRepo F()
    {
        var f = new CommitRepo(WegwerfRepo.MitCommits());
        f.Schreibe("a.txt", "a\n");
        f.Committe("p", "Start", "Carla Beispiel", ZeitP, "");
        f.Schreibe("b.txt", "b\n");
        f.Committe("t", "Betreff\u001fmit Trenner", "Anna\u001fBeispiel", ZeitT, "Rumpf\u001fmit Trenner");
        f.Schreibe("c.txt", "c\n");
        f.Committe("u", "Zweiter\u001e", "Bernd\u001eBeispiel", ZeitU, "Zeile eins\u001f\u001f\nZeile zwei");
        f.NulMessage("z", "Dora Beispiel", 1772700000, "Vor dem NUL\0danach\n\nRumpf\n");
        f.NulAutor("n", "NUL\0Name", 1772755200, "NUL im Autorkopf\n");
        f.Schreibe("d.txt", "d\n");
        f.GrosseNachricht("g", ZeitG, MessageNeunMiB, 'y');
        f.GrosseNachricht("h", ZeitH, MessageZwanzigMiB, 'x');
        f.GrosseNachricht("i", ZeitI, MessageSechsMiB, 'y');
        return f;
    }

    public static CommitRepo W()
    {
        var w = new CommitRepo(WegwerfRepo.MitCommits());
        w.Schreibe("a.txt", "a\n");
        w.Committe("p", "Start", "Anna Beispiel", ZeitP, "");
        for (var nummer = 0; nummer < 200; nummer++)
        {
            w.Schreibe($"datei-{nummer:D3}-{new string('x', 32)}.txt", "eine Zeile\n");
        }
        w.Committe("w", "Viele Dateien", "Anna Beispiel", ZeitT, "");
        w.MergeMitEltern("m", 120);
        return w;
    }

    public static CommitRepo E()
    {
        var e = new CommitRepo(WegwerfRepo.MitCommits());
        e.Schreibe("a.txt", "a\n");
        e.Committe("start", "Start", "A", ZeitT, "");
        e.KodierterCommit("utf16", "UTF-16LE", Encoding.Unicode.GetBytes("Hallo Welt"));
        e.KodierterCommit("utf7", "UTF-7", Encoding.ASCII.GetBytes("Betreff+ACA-\n\nRumpf+ACA-\n"));
        e.KodierterCommit("latin1", "ISO-8859-1", Encoding.GetEncoding("ISO-8859-1").GetBytes("Grüße é\n"));
        return e;
    }

    public static CommitRepo L()
    {
        var l = new CommitRepo(WegwerfRepo.OhneCommits());
        var befehle = new StringBuilder();
        const int Anzahl = 3000;
        var fueller = new string('l', 3000);
        for (var nummer = 1; nummer <= Anzahl; nummer++)
        {
            var nachricht = $"Commit {nummer:D4}\n{fueller}\n";
            befehle.Append($"commit refs/heads/main\ncommitter Testperson <test@example.invalid> {1772668800 + nummer} +0000\ndata {Encoding.UTF8.GetByteCount(nachricht)}\n{nachricht}\n");
        }
        l.FastImport(befehle.ToString());
        var hashes = l.Git("rev-list", "--reverse", "HEAD").Split('\n');
        l.Merke("a", hashes[0]);
        l.Merke("b", hashes[10]);
        l.Merke("c", hashes[Anzahl - 11]);
        l.Merke("d", hashes[Anzahl - 1]);
        return l;
    }

    /// <summary>Die Anzahl der Commits der Auswahl `a..b c..d` (je zehn) — für die Kontrolle im Test.</summary>
    public const int AuswahlZahlInL = 20;

    private void Schreibe(string pfad, string inhalt)
    {
        repo.SchreibeDatei(pfad, inhalt);
    }

    private void Committe(string name, string betreff, string autor, string datum, string rumpf)
    {
        Merke(name, repo.Committe(betreff, autor, datum, rumpf));
    }

    /// <summary>Ein Commit, dessen Message ein NUL trägt: `git hash-object -t commit -w --literally` (git schneidet am NUL ab).</summary>
    private void NulMessage(string name, string autor, long sekunde, string nachrichtMitNul)
    {
        var kopf = Kopf(autor, sekunde, encoding: null, parent: true);
        Merke(name, repo.HashObjectLiterally(AlsBytes(kopf + nachrichtMitNul)));
    }

    /// <summary>Ein Commit, dessen Autorkopf ein NUL trägt: git gibt `%an` leer und `%aI` als wörtlichen Text aus (L2).</summary>
    private void NulAutor(string name, string autorMitNul, long sekunde, string nachricht)
    {
        var kopf = Kopf(autorMitNul, sekunde, encoding: null, parent: true);
        Merke(name, repo.HashObjectLiterally(AlsBytes(kopf + nachricht)));
    }

    private void KodierterCommit(string name, string encoding, byte[] nachricht)
    {
        var kopf = Kopf("A", 1772700000, encoding, parent: true);
        Merke(name, repo.HashObjectLiterally([.. AlsBytes(kopf), .. nachricht]));
    }

    private void GrosseNachricht(string name, string datum, long groesse, char fuellzeichen)
    {
        var datei = Path.Combine(Ordner, $".nachricht-{name}.txt");
        File.WriteAllBytes(datei, NachrichtBytes(groesse, fuellzeichen));
        try
        {
            Merke(name, repo.CommitteAusDatei(datei, "Riesig Beispiel", datum));
        }
        finally
        {
            File.Delete(datei);
        }
    }

    /// <summary>Eine Message von mindestens <paramref name="groesse"/> Byte: eine Betreffzeile, dann Zeilen zu 1 024 Zeichen.</summary>
    private static byte[] NachrichtBytes(long groesse, char fuellzeichen)
    {
        const int Zeilenlaenge = 1024;
        var kopf = "Riesig\n\n";
        var zeilen = (int)((groesse - kopf.Length + Zeilenlaenge - 1) / Zeilenlaenge);
        var zeile = new string(fuellzeichen, Zeilenlaenge - 1) + "\n";
        var bauer = new StringBuilder(kopf.Length + (zeilen * Zeilenlaenge));
        bauer.Append(kopf);
        for (var nummer = 0; nummer < zeilen; nummer++)
        {
            bauer.Append(zeile);
        }
        return Encoding.UTF8.GetBytes(bauer.ToString());
    }

    private void MergeMitEltern(string name, int elternzahl)
    {
        var befehle = new StringBuilder();
        for (var nummer = 1; nummer <= elternzahl; nummer++)
        {
            var nachricht = $"Eltern {nummer}\n";
            befehle.Append($"commit refs/heads/eltern\ncommitter Testperson <test@example.invalid> {1772668800 + nummer} +0000\ndata {nachricht.Length}\n{nachricht}\n");
        }
        repo.FastImport(befehle.ToString());
        var eltern = repo.Git("rev-list", "--reverse", "eltern").Split('\n');
        var argumente = new List<string> { "commit-tree", Git("rev-parse", "HEAD^{tree}") };
        foreach (var elternteil in eltern)
        {
            argumente.Add("-p");
            argumente.Add(elternteil);
        }
        argumente.Add("-m");
        argumente.Add("Viele Eltern");
        Merke(name, Git([.. argumente]));
    }

    /// <summary>Der Commit-Kopf für `hash-object --literally`, mit Baum und Eltern des letzten Commits.</summary>
    private string Kopf(string autor, long sekunde, string? encoding, bool parent)
    {
        var bauer = new StringBuilder();
        bauer.Append($"tree {Git("rev-parse", "HEAD^{tree}")}\n");
        if (parent)
        {
            bauer.Append($"parent {Git("rev-parse", "HEAD")}\n");
        }
        bauer.Append($"author {autor} <a@example.org> {sekunde} +0100\n");
        bauer.Append($"committer {autor} <a@example.org> {sekunde} +0100\n");
        if (encoding is not null)
        {
            bauer.Append($"encoding {encoding}\n");
        }
        bauer.Append('\n');
        return bauer.ToString();
    }

    private static byte[] AlsBytes(string text)
    {
        return Encoding.UTF8.GetBytes(text);
    }

    private void Merke(string name, string hash)
    {
        hashNachName[name] = hash;
    }

    private void FastImport(string befehle)
    {
        repo.FastImport(befehle);
    }
}
