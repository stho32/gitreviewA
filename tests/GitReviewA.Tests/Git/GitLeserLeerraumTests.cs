using System.Runtime.Versioning;
using GitReviewA.Diff;
using GitReviewA.Fremdtext;
using GitReviewA.Git;
using GitReviewA.Tests.Akzeptanz;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Git;

/// <summary>
/// R00026: `-w` (`--ignore-all-space`) am selben `git show`/`git log --stdin`/`git diff --stdin` — reine Leerraum-Änderungen
/// innerhalb einer Zeile werden Kontext, eine hinzugefügte oder entfernte leere Zeile bleibt sichtbar, und die Nummern der Zeilen
/// bleiben dieselben. Die Schutzoptionen und der Rohbyte-Weg über stdin bleiben unberührt (AI-Team/gelerntes.md #10/#16/#28).
/// </summary>
[UnsupportedOSPlatform("windows")]
public class GitLeserLeerraumTests
{
    private const string Zeitpunkt = "2026-03-04T09:15:00+01:00";

    [Test]
    public void Wenn_Leerraum_ignoriert_dann_wird_die_Einrueckung_Kontext_und_die_leere_Zeile_bleibt()
    {
        using var repo = LeerraumRepos.Anlegen();
        var datei = new Dateiaenderung("M", "leerraum.txt", null, 2, 1);

        var beachten = Patch(repo, datei, Leerraum.Beachten);
        var ignorieren = Patch(repo, datei, Leerraum.Ignorieren);

        Assert.That(beachten, Is.EqualTo("@@ -1,4 +1,5 @@\n eins\n-zwei\n-drei\n+  zwei\n+drei geaendert\n vier\n+\n"));
        Assert.That(ignorieren, Is.EqualTo("@@ -1,4 +1,5 @@\n eins\n   zwei\n-drei\n+drei geaendert\n vier\n+\n"));
    }

    [Test]
    public void Wenn_Leerraum_ignoriert_dann_traegt_jede_Zeile_dieselbe_Nummer_wie_die_Datei_des_Standes()
    {
        using var repo = LeerraumRepos.Anlegen();
        var datei = new Dateiaenderung("M", "leerraum.txt", null, 2, 1);

        var ignorieren = Patch(repo, datei, Leerraum.Ignorieren);

        var standAlt = Zeilen(repo.Repo.Git("show", $"{repo.W1}:leerraum.txt"));
        var standNeu = Zeilen(repo.Repo.Git("show", $"{repo.W2}:leerraum.txt"));
        var mitNummerNeu = ignorieren.Split('\n').Where(zeile => zeile.StartsWith(' ') || zeile.StartsWith('+')).Select(zeile => zeile[1..]);
        Assert.That(mitNummerNeu, Is.EqualTo(new[] { standNeu[0], standNeu[1], standNeu[2], standNeu[3], string.Empty }),
            "die leere Zeile 5 des Standes trägt keinen Text; `git show` schneidet ihr Zeilenende ab");
        Assert.That(MitVorzeichen(ignorieren, '-').Select(zeile => zeile[1..]), Is.EqualTo(new[] { standAlt[2] }));
    }

    [Test]
    public void Wenn_die_ganze_Datei_mit_ignoriertem_Leerraum_gelesen_wird_dann_dieselben_Nummern_wie_im_Stand()
    {
        using var repo = LeerraumRepos.Anlegen();
        var datei = new Dateiaenderung("M", "leerraum.txt", null, 2, 1);

        var ignorieren = Patch(repo, datei, Leerraum.Ignorieren, Diffumfang.Ganz);

        var standNeu = Zeilen(repo.Repo.Git("show", $"{repo.W2}:leerraum.txt"));
        Assert.That(ignorieren, Is.EqualTo("@@ -1,4 +1,5 @@\n eins\n   zwei\n-drei\n+drei geaendert\n vier\n+\n"));
        Assert.That(MitVorzeichen(ignorieren, ' ').ElementAt(1)[1..], Is.EqualTo(standNeu[1]), "die Einrückung ist Kontext, ihr Text die Zeile 2 des Standes");
    }

    /// <summary>Ein Name aus Rohbytes geht über stdin (`git log --stdin`); `-w` gilt dort genauso (AI-Team/gelerntes.md #16/#28).</summary>
    [Test]
    public void Wenn_der_Name_Rohbytes_traegt_dann_wirkt_die_Leerraum_Stellung_auch_auf_dem_stdin_Weg()
    {
        using var repo = FremdeNamenRepo.AusSkript(
            """
            set -e
            printf 'eins\nzwei\ndrei\n' > $'f\xff.txt'
            git add -A && git commit -q -m "Start"
            printf 'eins\n  zwei\ndrei geaendert\n' > $'f\xff.txt'
            git add -A && git commit -q -m "Einrueckung"
            rm -f -- $'f\xff.txt'
            """,
            "n1", "n2");
        var datei = new Dateiaenderung("M", "f⟨0xFF⟩.txt", null, 1, 1, new Rohname([0x66, 0xFF, 0x2E, 0x74, 0x78, 0x74]));

        var beachten = Patch(repo.Ordner, repo.Hash("n2"), datei, Leerraum.Beachten);
        var ignorieren = Patch(repo.Ordner, repo.Hash("n2"), datei, Leerraum.Ignorieren);

        Assert.That(beachten, Is.EqualTo("@@ -1,3 +1,3 @@\n eins\n-zwei\n-drei\n+  zwei\n+drei geaendert\n"));
        Assert.That(ignorieren, Is.EqualTo("@@ -1,3 +1,3 @@\n eins\n   zwei\n-drei\n+drei geaendert\n"));
    }

    private static string Patch(LeerraumRepos repo, Dateiaenderung datei, Leerraum leerraum, Diffumfang umfang = Diffumfang.Aenderungen)
    {
        return Patch(repo.Repo.Ordner, repo.W2, datei, leerraum, umfang);
    }

    private static string Patch(string arbeitsordner, string hash, Dateiaenderung datei, Leerraum leerraum, Diffumfang umfang = Diffumfang.Aenderungen)
    {
        return Diffaufbereitung.PatchAbErstemHunk(GitLeser.DiffLesen(hash, datei, umfang, arbeitsordner, leerraum));
    }

    private static IEnumerable<string> MitVorzeichen(string patch, char vorzeichen)
    {
        return patch.Split('\n').Where(zeile => zeile.Length > 0 && zeile[0] == vorzeichen);
    }

    private static string[] Zeilen(string inhalt)
    {
        return inhalt.Split('\n', StringSplitOptions.RemoveEmptyEntries);
    }

    /// <summary>Repo W der User Story R00026: `w1` legt `leerraum.txt` und `weit.txt` an, `w2` ändert in beiden.</summary>
    private sealed class LeerraumRepos(WegwerfRepo repo, string w1, string w2) : IDisposable
    {
        public WegwerfRepo Repo => repo;

        public string W1 => w1;

        public string W2 => w2;

        public static LeerraumRepos Anlegen()
        {
            var repo = WegwerfRepo.MitCommits();
            repo.SchreibeDatei("leerraum.txt", "eins\nzwei\ndrei\nvier\n");
            repo.SchreibeDatei("weit.txt", WeitDatei());
            var w1 = repo.Committe("w1", "Anna Beispiel", Zeitpunkt, "");
            repo.SchreibeDatei("leerraum.txt", "eins\n  zwei\ndrei geaendert\nvier\n\n");
            repo.SchreibeDatei("weit.txt", WeitDatei().Replace("z05\n", "Z05\n").Replace("z35\n", "Z35\n"));
            var w2 = repo.Committe("w2", "Anna Beispiel", Zeitpunkt, "");
            return new LeerraumRepos(repo, w1, w2);
        }

        public void Dispose()
        {
            repo.Dispose();
        }

        private static string WeitDatei()
        {
            var zeilen = Enumerable.Range(1, 19).Select(nummer => $"z{nummer:D2}\n").ToList();
            zeilen.Add("<b>z20</b>\n");
            zeilen.Add("a\u202Eb\n");
            zeilen.AddRange(Enumerable.Range(22, 39).Select(nummer => $"z{nummer:D2}\n"));
            return string.Concat(zeilen);
        }
    }
}
