using System.Runtime.Versioning;
using GitReviewA.Aufruf;
using GitReviewA.Git;
using GitReviewA.Protokoll;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Aufruf;

[Platform(Exclude = "Win", Reason = "Marker-Programm ist ein Shell-Skript")]
[UnsupportedOSPlatform("windows")]
public class AufrufInteractorTests
{
    [Test]
    public async Task Wenn_Bereich_ohne_Commits_dann_leere_Auswahl()
    {
        using var repo = WegwerfRepo.MitCommits("a", "b", "c");
        var b = repo.Hashes[1];

        var folge = await StarteAsync(repo.Ordner, [$"{b}..{b}"]);

        var fehler = Abweisung(folge);
        Assert.That(fehler.Grund, Is.EqualTo(Aufrufgrund.LeereAuswahl));
        Assert.That(fehler.Meldung, Does.Contain("leer"));
    }

    [Test]
    public async Task Wenn_HEAD_bis_HEAD_dann_ebenfalls_leere_Auswahl()
    {
        using var repo = WegwerfRepo.MitCommits("a", "b", "c");

        var folge = await StarteAsync(repo.Ordner, ["HEAD..HEAD"]);

        Assert.That(Abweisung(folge).Grund, Is.EqualTo(Aufrufgrund.LeereAuswahl));
    }

    [Test]
    public async Task Wenn_stdin_leer_dann_leere_Auswahl()
    {
        using var repo = WegwerfRepo.MitCommits("a", "b", "c");

        var folge = await StarteAsync(repo.Ordner, ["-"], eingabe: string.Empty);

        var fehler = Abweisung(folge);
        Assert.That(fehler.Grund, Is.EqualTo(Aufrufgrund.LeereAuswahl));
        Assert.That(fehler.Meldung, Does.Contain("leer"));
    }

    [Test]
    public async Task Wenn_Ordner_in_keinem_Repo_dann_kein_Repository()
    {
        var ordner = Directory.CreateTempSubdirectory("gitreviewa-kein-repo-").FullName;
        try
        {
            var folge = await StarteAsync(ordner, ["deadbeefdeadbeef"]);

            var fehler = Abweisung(folge);
            Assert.That(fehler.Grund, Is.EqualTo(Aufrufgrund.KeinRepository));
            Assert.That(fehler.Meldung, Does.Contain("Repository"));
            Assert.That(fehler.Debugtext, Is.Not.Empty);
        }
        finally
        {
            Directory.Delete(ordner, recursive: true);
        }
    }

    [Test]
    public async Task Wenn_nacktes_Repo_dann_nacktes_Repository()
    {
        using var repo = WegwerfRepo.MitCommits("a");
        var ordner = Directory.CreateTempSubdirectory("gitreviewa-nackt-").FullName;
        try
        {
            repo.Git("clone", "--bare", "-q", repo.Ordner, ordner);

            var folge = await StarteAsync(ordner, ["deadbeefdeadbeef"]);

            var fehler = Abweisung(folge);
            Assert.That(fehler.Grund, Is.EqualTo(Aufrufgrund.NacktesRepository));
            Assert.That(fehler.Meldung, Does.Contain("Arbeitsbaum"));
        }
        finally
        {
            Directory.Delete(ordner, recursive: true);
        }
    }

    [Test]
    public async Task Wenn_Hash_unbekannt_dann_Auswahl_nicht_aufloesbar()
    {
        using var repo = WegwerfRepo.MitCommits("a");

        var folge = await StarteAsync(repo.Ordner, ["deadbeefdeadbeef"]);

        var fehler = Abweisung(folge);
        Assert.That(fehler.Grund, Is.EqualTo(Aufrufgrund.AuswahlNichtAufloesbar));
        Assert.That(fehler.Meldung, Does.Contain("auflösen"));
        Assert.That(fehler.Debugtext, Does.Contain("fatal:"));
    }

    [Test]
    public async Task Wenn_Hash_aus_einem_anderen_Repo_dann_Auswahl_nicht_aufloesbar()
    {
        using var repo = WegwerfRepo.MitCommits("a");
        using var fremd = WegwerfRepo.MitCommits("x");

        var folge = await StarteAsync(repo.Ordner, [fremd.Hashes[0]]);

        Assert.That(Abweisung(folge).Grund, Is.EqualTo(Aufrufgrund.AuswahlNichtAufloesbar));
    }

    [Test]
    public async Task Wenn_Objektdatei_des_Commits_entfernt_dann_Auswahl_nicht_aufloesbar()
    {
        using var repo = WegwerfRepo.MitCommits("a");
        var hash = repo.Hashes[0];
        ObjektdateiEntfernen(repo.Ordner, hash);

        var folge = await StarteAsync(repo.Ordner, [hash]);

        Assert.That(Abweisung(folge).Grund, Is.EqualTo(Aufrufgrund.AuswahlNichtAufloesbar));
    }

    [Test]
    [NonParallelizable]
    public async Task Wenn_git_nicht_im_Suchpfad_dann_git_nicht_gefunden()
    {
        var leererOrdner = Directory.CreateTempSubdirectory("gitreviewa-ohne-git-").FullName;
        var alterSuchpfad = Environment.GetEnvironmentVariable("PATH");
        try
        {
            Environment.SetEnvironmentVariable("PATH", leererOrdner);

            var folge = await StarteAsync(leererOrdner, ["deadbeefdeadbeef"]);

            var fehler = Abweisung(folge);
            Assert.That(fehler.Grund, Is.EqualTo(Aufrufgrund.GitNichtGefunden));
            Assert.That(fehler.Meldung, Does.Contain("git"));
        }
        finally
        {
            Environment.SetEnvironmentVariable("PATH", alterSuchpfad);
            Directory.Delete(leererOrdner, recursive: true);
        }
    }

    [Test]
    public async Task Wenn_gultiger_Hash_dann_Erfolg_mit_der_Wurzel()
    {
        using var repo = WegwerfRepo.MitCommits("a", "b");

        var (commits, wurzel) = Erfolg(await StarteAsync(repo.Ordner, [repo.Hashes[0]]));

        Assert.That(wurzel, Is.EqualTo(Path.GetFullPath(repo.Ordner)));
        Assert.That(commits.Anzahl, Is.EqualTo(1));
    }

    [Test]
    public async Task Wenn_gultiger_Hash_aus_einem_Unterordner_dann_Erfolg_mit_der_obersten_Wurzel()
    {
        using var repo = WegwerfRepo.MitCommits("a");
        var unterordner = Path.Combine(repo.Ordner, "unten", "tiefer");
        Directory.CreateDirectory(unterordner);

        var folge = await StarteAsync(unterordner, [repo.Hashes[0]]);

        Assert.That(folge.IstErfolg, Is.True);
        Assert.That(folge.Arbeitsbaumwurzel, Is.EqualTo(Path.GetFullPath(repo.Ordner)));
    }

    [Test]
    public async Task Wenn_das_Repo_Signaturpruefung_mit_Marker_verlangt_dann_startet_die_Repopruefung_das_Programm_nicht()
    {
        using var repo = WegwerfRepo.MitCommits("a");
        var marker = MarkerProgrammSetzen(repo);
        var signiert = SigniertenCommitAnlegen(repo);
        repo.Git("update-ref", "refs/heads/main", signiert);

        var leererBereich = await StarteAsync(repo.Ordner, [$"{signiert}..{signiert}"]);
        var gueltig = await StarteAsync(repo.Ordner, [signiert]);

        Assert.That(Abweisung(leererBereich).Grund, Is.EqualTo(Aufrufgrund.LeereAuswahl));
        var (commits, _) = Erfolg(gueltig);
        Assert.That(commits.Anzahl, Is.EqualTo(1));
        Assert.That(File.Exists(marker), Is.False, "das Programm aus der Konfiguration des Repos lief");
        repo.Git("log", "-1", "--format=%H", signiert);
        Assert.That(File.Exists(marker), Is.True, "Kontrolle: das Marker-Programm ist über git log aufrufbar");
    }

    private static string MarkerProgrammSetzen(WegwerfRepo repo)
    {
        var marker = Path.Combine(repo.Ordner, ".git", "marker.txt");
        var programm = Path.Combine(repo.Ordner, ".git", "marker.sh");
        File.WriteAllText(programm, $"#!/bin/sh\necho \"$@\" >> '{marker}'\n");
        File.SetUnixFileMode(programm, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        repo.Git("config", "log.showSignature", "true");
        repo.Git("config", "gpg.program", programm);
        return marker;
    }

    private static string SigniertenCommitAnlegen(WegwerfRepo repo)
    {
        var commit = repo.Git("cat-file", "-p", "HEAD");
        var signatur = "gpgsig -----BEGIN PGP SIGNATURE-----\n \n AAAA\n -----END PGP SIGNATURE-----";
        var kopfEnde = commit.IndexOf("\n\n", StringComparison.Ordinal);
        var signierterCommit = $"{commit[..kopfEnde]}\n{signatur}{commit[kopfEnde..]}\n";
        var commitdatei = Path.Combine(repo.Ordner, ".git", "signierter-commit");
        File.WriteAllText(commitdatei, signierterCommit);
        return repo.Git("hash-object", "-t", "commit", "-w", commitdatei);
    }

    private static void ObjektdateiEntfernen(string ordner, string hash)
    {
        var datei = Path.Combine(ordner, ".git", "objects", hash[..2], hash[2..]);
        File.Delete(datei);
    }

    private static async Task<Aufruffolge> StarteAsync(string arbeitsordner, string[] argumente, string eingabe = "")
    {
        var startauftrag = Auftrag(argumente);
        var stdin = new Standardeingabe(new StringReader(eingabe), IstTerminal: false);
        var anfrage = new Aufrufanfrage(startauftrag, stdin, arbeitsordner);
        return await AufrufInteractor.StarteAsync(anfrage, Protokoll());
    }

    private static StderrProtokoll Protokoll()
    {
        return new StderrProtokoll(new StringWriter(), TimeProvider.System, Protokollstufe.Warnung);
    }

    private static Startauftrag Auftrag(string[] argumente)
    {
        var ergebnis = Aufrufleser.Lesen(argumente);
        if (ergebnis.IstGueltig)
        {
            return ergebnis.Startauftrag;
        }
        Assert.Fail($"Aufruf nicht lesbar: {ergebnis.Fehlermeldung}");
        throw new InvalidOperationException("nicht erreichbar");
    }

    private static Aufruffehler Abweisung(Aufruffolge folge)
    {
        if (!folge.IstErfolg)
        {
            return folge.Fehler;
        }
        Assert.Fail("erwartet: ungültiger Aufruf");
        throw new InvalidOperationException("nicht erreichbar");
    }

    private static (Commitzeilen Commits, string Arbeitsbaumwurzel) Erfolg(Aufruffolge folge)
    {
        if (folge.IstErfolg)
        {
            return (folge.Commits, folge.Arbeitsbaumwurzel);
        }
        Assert.Fail("erwartet: gültiger Aufruf");
        throw new InvalidOperationException("nicht erreichbar");
    }
}
