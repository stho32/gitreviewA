using System.Runtime.Versioning;
using GitReviewA.Aufruf;
using GitReviewA.Git;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Git;

[Platform(Exclude = "Win", Reason = "Marker-Programm ist ein Shell-Skript")]
[UnsupportedOSPlatform("windows")]
public class GitLeserFremdeKonfigurationTests
{
    [TestCase("PGP")]
    [TestCase("SSH")]
    public void Wenn_das_Repo_Signaturpruefung_mit_eigenem_Programm_verlangt_dann_startet_gitreviewA_das_Programm_nicht(string signaturart)
    {
        using var repo = WegwerfRepo.MitCommits("Erster Commit");
        var marker = Path.Combine(repo.Ordner, ".git", "marker.txt");
        LegeSignaturpruefungMitMarkerProgrammAn(repo, signaturart, marker);
        var signierterHash = SigniertenCommitAnlegen(repo, signaturart);

        var zeilen = GitLeser.Lesen(new CommitHashes([signierterHash]), repo.Ordner).AlsArray();

        Assert.That(zeilen.Select(zeile => (zeile.Hash, zeile.Betreff)), Is.EqualTo(new[] { (signierterHash, "Erster Commit") }));
        Assert.That(File.Exists(marker), Is.False, "das Programm aus der Konfiguration des Repos lief");
        repo.Git("log", "--no-walk", "--format=%H", signierterHash);
        Assert.That(File.Exists(marker), Is.True, "Kontrolle: das Marker-Programm ist über git log aufrufbar");
    }

    [TestCase("PGP")]
    [TestCase("SSH")]
    public void Wenn_ein_Bereich_ueber_einen_signierten_Commit_laeuft_dann_startet_gitreviewA_das_Programm_des_Repos_nicht(string signaturart)
    {
        using var repo = WegwerfRepo.MitCommits("Basis", "Signierter Commit");
        var marker = Path.Combine(repo.Ordner, ".git", "marker.txt");
        LegeSignaturpruefungMitMarkerProgrammAn(repo, signaturart, marker);
        var signierterHash = SigniertenCommitAnlegen(repo, signaturart);
        repo.Git("update-ref", "refs/heads/main", signierterHash);

        var zeilen = GitLeser.LeseBereiche(new Bereiche([$"{repo.Hashes[0]}..main"]), repo.Ordner).AlsArray();
        var ausZweiBereichen = GitLeser.LeseBereiche(new Bereiche([$"{repo.Hashes[0]}..main", "main~1..main"]), repo.Ordner).AlsArray();

        Assert.That(zeilen, Is.EqualTo(new[] { new Commitzeile(signierterHash, "Signierter Commit") }));
        Assert.That(ausZweiBereichen, Is.EqualTo(zeilen));
        Assert.That(File.Exists(marker), Is.False, "das Programm aus der Konfiguration des Repos lief");
        repo.Git("log", "--format=%H", $"{repo.Hashes[0]}..main");
        Assert.That(File.Exists(marker), Is.True, "Kontrolle: das Marker-Programm ist über git log mit Bereich aufrufbar");
    }

    [TestCase("diff.x.textconv")]
    [TestCase("diff.x.command")]
    [TestCase("diff.external")]
    public void Wenn_das_Repo_ein_Diff_Programm_verlangt_dann_startet_das_Lesen_der_Dateiliste_das_Programm_nicht(string schluessel)
    {
        using var repo = WegwerfRepo.MitCommits();
        var marker = Path.Combine(repo.Ordner, ".git", "marker.txt");
        var programm = MarkerProgrammAnlegen(repo, marker);
        repo.SchreibeDatei(".gitattributes", "*.txt diff=x\n");
        repo.SchreibeDatei("a.txt", "eins\n");
        repo.Committe("Erster", "A", "2026-03-04T09:15:00+01:00", "");
        repo.SchreibeDatei("a.txt", "eins\nzwei\n");
        var hash = repo.Committe("Zweiter", "A", "2026-03-04T09:16:00+01:00", "");
        repo.Git("config", schluessel, programm);

        var dateien = GitLeser.DateienLesen(hash, repo.Ordner).AlsArray();

        Assert.That(dateien, Is.EqualTo(new[] { new Dateiaenderung("M", "a.txt", null, 1, 0) }));
        Assert.That(File.Exists(marker), Is.False, "das Programm aus der Konfiguration des Repos lief");
        repo.Git("diff", $"{hash}~", hash);
        Assert.That(File.Exists(marker), Is.True, "Kontrolle: das Marker-Programm ist über git diff aufrufbar");
    }

    private static string MarkerProgrammAnlegen(WegwerfRepo repo, string marker)
    {
        var programm = Path.Combine(repo.Ordner, ".git", "marker.sh");
        File.WriteAllText(programm, $"#!/bin/sh\necho \"$@\" >> '{marker}'\ncat \"$1\" 2>/dev/null\n");
        File.SetUnixFileMode(programm, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        return programm;
    }

    private static void LegeSignaturpruefungMitMarkerProgrammAn(WegwerfRepo repo, string signaturart, string marker)
    {
        var programm = Path.Combine(repo.Ordner, ".git", "marker.sh");
        File.WriteAllText(programm, $"#!/bin/sh\necho \"$@\" >> '{marker}'\n");
        File.SetUnixFileMode(programm, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        repo.Git("config", "log.showSignature", "true");
        if (signaturart == "SSH")
        {
            var erlaubteSignierer = Path.Combine(repo.Ordner, ".git", "erlaubte-signierer");
            File.WriteAllText(erlaubteSignierer, "");
            repo.Git("config", "gpg.format", "ssh");
            repo.Git("config", "gpg.ssh.program", programm);
            repo.Git("config", "gpg.ssh.allowedSignersFile", erlaubteSignierer);
            return;
        }
        repo.Git("config", "gpg.program", programm);
    }

    private static string SigniertenCommitAnlegen(WegwerfRepo repo, string signaturart)
    {
        var commit = repo.Git("cat-file", "-p", "HEAD");
        var signatur = $"gpgsig -----BEGIN {signaturart} SIGNATURE-----\n \n AAAA\n -----END {signaturart} SIGNATURE-----";
        var kopfEnde = commit.IndexOf("\n\n", StringComparison.Ordinal);
        var signierterCommit = $"{commit[..kopfEnde]}\n{signatur}{commit[kopfEnde..]}\n";
        var commitdatei = Path.Combine(repo.Ordner, ".git", "signierter-commit");
        File.WriteAllText(commitdatei, signierterCommit);
        return repo.Git("hash-object", "-t", "commit", "-w", commitdatei);
    }
}
