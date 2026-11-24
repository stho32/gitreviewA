using System.Runtime.Versioning;
using GitReviewA.Aufruf;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Git;

/// <summary>
/// Übersicht aller Dateien der Auswahl (R00011, B1001): ein git-Aufruf für alle Commits, Orakel ist die Dateiliste je Commit (R00003).
/// </summary>
[Platform(Exclude = "Win", Reason = "Marker-Programm ist ein Shell-Skript")]
[UnsupportedOSPlatform("windows")]
public class GitLeserUebersichtTests
{
    [Test]
    public void Wenn_Wurzel_Aenderung_leerer_Commit_und_Merge_in_beliebiger_Reihenfolge_dann_Stellen_wie_die_Dateilisten_in_Auswahlreihenfolge()
    {
        using var repo = WegwerfRepo.MitCommits();
        var commits = VorbereitungMitMerge(repo);
        var auswahl = new[] { commits.Q, commits.R, commits.Merge, commits.P };

        var stellen = GitLeser.UebersichtLesen(new CommitHashes(auswahl), repo.Ordner).AlsArray();

        Assert.That(stellen, Is.EqualTo(OrakelAusDenDateilisten(auswahl, repo.Ordner)));
        var commitsDerStellen = stellen.Select(stelle => stelle.Commit);
        Assert.That(commitsDerStellen, Is.EqualTo(new[] { commits.Q, commits.Q, commits.Q, commits.Q, commits.Merge, commits.P, commits.P, commits.P, commits.P }));
    }

    [Test]
    public void Wenn_die_Auswahl_gelesen_wird_dann_kennt_die_Uebersicht_auch_den_leeren_Commit_und_zaehlt_acht_Stellen()
    {
        using var repo = WegwerfRepo.MitCommits();
        var commits = VorbereitungMitMerge(repo);

        var uebersicht = GitLeser.UebersichtLesen(new CommitHashes([commits.P, commits.Q, commits.R]), repo.Ordner);

        Assert.That(uebersicht.Anzahl, Is.EqualTo(8));
        Assert.That(uebersicht.EnthaeltCommit(commits.R), Is.True);
        Assert.That(uebersicht.Enthaelt(new Stelle(commits.Q, "LIESMICH.md")), Is.True);
        Assert.That(uebersicht.Enthaelt(new Stelle(commits.Q, "README.md")), Is.False, "bei R gilt der neue Pfad");
        Assert.That(uebersicht.Enthaelt(new Stelle(commits.R, "alt.txt")), Is.False);
    }

    [Test]
    public void Wenn_core_quotepath_gesetzt_und_Pfad_mit_Umlauten_dann_steht_er_mit_Umlauten_in_der_Uebersicht()
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.Git("config", "core.quotepath", "true");
        repo.SchreibeDatei("ä ö.txt", "eins\n");
        var hash = repo.Committe("Umlaute", "A", "2026-03-06T08:00:00+01:00", "");

        var stellen = GitLeser.UebersichtLesen(new CommitHashes([hash]), repo.Ordner).AlsArray();

        Assert.That(stellen, Is.EqualTo(new[] { new Stelle(hash, "ä ö.txt") }));
    }

    [Test]
    public void Wenn_das_Repo_Programme_und_eine_andere_Basis_verlangt_dann_laeuft_kein_Programm_und_die_Uebersicht_gleicht_der_Dateiliste()
    {
        using var repo = WegwerfRepo.MitCommits();
        var commits = VorbereitungMitMerge(repo);
        var marker = Path.Combine(repo.Ordner, ".git", "marker.txt");
        var programm = MarkerProgrammAnlegen(repo, marker);
        repo.SchreibeDatei(".git/info/attributes", "* diff=x\n");
        repo.Git("config", "diff.external", programm);
        repo.Git("config", "diff.x.textconv", programm);
        repo.Git("config", "diff.x.command", programm);
        repo.Git("config", "log.showSignature", "true");
        repo.Git("config", "gpg.program", programm);
        repo.Git("config", "log.showRoot", "false");
        repo.Git("config", "log.diffMerges", "combined");
        var auswahl = new[] { commits.P, commits.Q, commits.R, commits.Merge };

        var stellen = GitLeser.UebersichtLesen(new CommitHashes(auswahl), repo.Ordner).AlsArray();

        Assert.That(File.Exists(marker), Is.False, "ein Programm aus der Konfiguration des Repos lief");
        Assert.That(stellen, Is.EqualTo(OrakelAusDenDateilisten(auswahl, repo.Ordner)));
        Assert.That(stellen, Has.Length.EqualTo(9));
        repo.Git("log", "-p", "-1", commits.Q);
        Assert.That(File.Exists(marker), Is.True, "Kontrolle: das Marker-Programm ist über git log -p aufrufbar");
    }

    [Test]
    public void Wenn_aus_einem_Unterordner_gelesen_wird_dann_stehen_die_Pfade_ab_der_Wurzel()
    {
        using var repo = WegwerfRepo.MitCommits();
        var commits = VorbereitungMitMerge(repo);
        repo.Git("config", "diff.relative", "true");

        var stellen = GitLeser.UebersichtLesen(new CommitHashes([commits.P]), Path.Combine(repo.Ordner, "src")).AlsArray();

        Assert.That(stellen.Select(stelle => stelle.Pfad), Is.EqualTo(new[] { "README.md", "alt.txt", "src/a.txt", "src/b.txt" }));
    }

    [Test]
    public void Wenn_das_Objekt_eines_Commits_fehlt_dann_GitFehler()
    {
        using var repo = WegwerfRepo.MitCommits("Erster Commit", "Zweiter Commit");
        var hash = repo.Hashes[1];
        File.Delete(Path.Combine(repo.Ordner, ".git", "objects", hash[..2], hash[2..]));

        var fehler = Assert.Throws<GitFehler>(() => GitLeser.UebersichtLesen(new CommitHashes([repo.Hashes[0], hash]), repo.Ordner));

        Assert.That(fehler.Message, Does.Contain("git log"));
    }

    private static Stelle[] OrakelAusDenDateilisten(string[] auswahl, string arbeitsordner)
    {
        var stellen = new List<Stelle>();
        foreach (var hash in auswahl)
        {
            foreach (var datei in GitLeser.DateienLesen(hash, arbeitsordner))
            {
                stellen.Add(new Stelle(hash, datei.Pfad));
            }
        }
        return stellen.ToArray();
    }

    /// <summary>Vorbereitung R00003 (`p`, `q`, `r`) und ein Merge eines Seitenzweigs auf `p` mit `seite.txt`.</summary>
    private static Vorbereitung VorbereitungMitMerge(WegwerfRepo repo)
    {
        repo.SchreibeDatei("README.md", "Zeile 1\nZeile 2\n");
        repo.SchreibeDatei("src/a.txt", "a\nb\nc\n");
        repo.SchreibeDatei("src/b.txt", "x\ny\n");
        repo.SchreibeDatei("alt.txt", "1\n2\n3\n4\n");
        var p = repo.Committe("Start", "Anna Beispiel", "2026-03-04T09:15:00+01:00", "");
        repo.Git("mv", "README.md", "LIESMICH.md");
        File.Delete(Path.Combine(repo.Ordner, "alt.txt"));
        repo.SchreibeDatei("src/b.txt", "x\nY\nz\n");
        File.WriteAllBytes(Path.Combine(repo.Ordner, "logo.bin"), [0, 1, 2, 3, 0, 255]);
        var q = repo.Committe("Dateien ändern", "Bernd Beispiel", "2026-03-05T18:30:00+01:00", "");
        var r = repo.Committe("Nichts", "A", "2026-03-06T08:00:00+01:00", "");
        repo.Git("checkout", "-q", "-b", "seite", p);
        repo.SchreibeDatei("seite.txt", "von der Seite\n");
        repo.Committe("Seite", "A", "2026-03-06T08:01:00+01:00", "");
        repo.Git("checkout", "-q", "main");
        var merge = repo.Merge("seite", "Merge");
        return new Vorbereitung(p, q, r, merge);
    }

    private static string MarkerProgrammAnlegen(WegwerfRepo repo, string marker)
    {
        var programm = Path.Combine(repo.Ordner, ".git", "marker.sh");
        File.WriteAllText(programm, $"#!/bin/sh\necho \"$@\" >> '{marker}'\ncat \"$1\" 2>/dev/null\n");
        File.SetUnixFileMode(programm, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        return programm;
    }

    private sealed record Vorbereitung(string P, string Q, string R, string Merge);
}
