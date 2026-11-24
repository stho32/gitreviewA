using GitReviewA.Aufruf;
using GitReviewA.Git;
using GitReviewA.Protokoll;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Aufruf;

public class CommitsDerAuswahlTests
{
    private static readonly DateTimeOffset Jetzt = new(2026, 11, 24, 9, 0, 0, TimeSpan.FromHours(1));

    [Test]
    public async Task Wenn_Auswahl_ueber_stdin_dann_Commits_in_Reihenfolge_der_Eingabe()
    {
        using var repo = WegwerfRepo.MitCommits("a", "b", "c");
        var stdin = new Standardeingabe(new StringReader($"{repo.Hashes[2]}\n{repo.Hashes[0]}\n"), IstTerminal: false);

        var commits = await CommitsDerAuswahl.LesenAsync(Auswahl.UeberStdin(), stdin, repo.Ordner, Protokoll(new StringWriter()));

        Assert.That(commits.AlsArray().Select(zeile => zeile.Betreff), Is.EqualTo(new[] { "c", "a" }));
    }

    [Test]
    public async Task Wenn_Auswahl_ohne_Minus_dann_wird_stdin_nicht_gelesen()
    {
        using var repo = WegwerfRepo.MitCommits("a", "b", "c");
        var eingabe = new ZaehlendeEingabe();
        var stdin = new Standardeingabe(eingabe, IstTerminal: false);

        await CommitsDerAuswahl.LesenAsync(Auswahl.AusBereichen(new Bereiche(["HEAD~1.."])), stdin, repo.Ordner, Protokoll(new StringWriter()));
        await CommitsDerAuswahl.LesenAsync(Auswahl.AusEinzelcommits(new CommitHashes([repo.Hashes[0]])), stdin, repo.Ordner, Protokoll(new StringWriter()));

        Assert.That(eingabe.Lesevorgaenge, Is.Zero);
    }

    [Test]
    public async Task Wenn_200_Commits_dann_keine_Warnung()
    {
        using var repo = WegwerfRepo.MitVielenCommits(200);
        var stderr = new StringWriter();

        var commits = await CommitsDerAuswahl.LesenAsync(Auswahl.AusBereichen(new Bereiche([$"{repo.Hashes[0]}..HEAD"])), OhneStdin(), repo.Ordner, Protokoll(stderr));

        Assert.That(commits.Anzahl, Is.EqualTo(200));
        Assert.That(stderr.ToString(), Is.Empty);
    }

    [Test]
    public async Task Wenn_201_Commits_dann_eine_Warnung_mit_der_Anzahl()
    {
        using var repo = WegwerfRepo.MitVielenCommits(201);
        var stderr = new StringWriter();

        var commits = await CommitsDerAuswahl.LesenAsync(Auswahl.AusBereichen(new Bereiche([$"{repo.Hashes[0]}..HEAD"])), OhneStdin(), repo.Ordner, Protokoll(stderr));

        Assert.That(commits.Anzahl, Is.EqualTo(201));
        var zeilen = stderr.ToString().Split('\n', StringSplitOptions.RemoveEmptyEntries);
        Assert.That(zeilen, Has.Length.EqualTo(1));
        Assert.That(zeilen[0], Does.Contain("WARNUNG [Auswahl]"));
        Assert.That(zeilen[0], Does.Contain("201 Commits"));
    }

    [Test]
    public async Task Wenn_201_Commits_und_quiet_dann_keine_Warnung()
    {
        using var repo = WegwerfRepo.MitVielenCommits(201);
        var stderr = new StringWriter();

        await CommitsDerAuswahl.LesenAsync(Auswahl.AusBereichen(new Bereiche([$"{repo.Hashes[0]}..HEAD"])), OhneStdin(), repo.Ordner, Protokoll(stderr, Protokollstufe.Fehler));

        Assert.That(stderr.ToString(), Is.Empty);
    }

    [Test]
    public void Wenn_Bereich_mit_1001_Commits_dann_abgelehnt_mit_der_Grenze()
    {
        using var repo = WegwerfRepo.MitVielenCommits(1001);

        var fehler = Assert.ThrowsAsync<AuswahlFehler>(() =>
            CommitsDerAuswahl.LesenAsync(Auswahl.AusBereichen(new Bereiche([$"{repo.Hashes[0]}..HEAD"])), OhneStdin(), repo.Ordner, Protokoll(new StringWriter())));

        Assert.That(fehler.Message, Does.Contain("1 000"));
    }

    [Test]
    public void Wenn_Einzelcommits_ueber_der_Grenze_dann_ebenfalls_abgelehnt()
    {
        using var repo = WegwerfRepo.MitVielenCommits(1001);
        var hashes = new CommitHashes(repo.Hashes.Skip(1));

        var fehler = Assert.ThrowsAsync<AuswahlFehler>(() =>
            CommitsDerAuswahl.LesenAsync(Auswahl.AusEinzelcommits(hashes), OhneStdin(), repo.Ordner, Protokoll(new StringWriter())));

        Assert.That(fehler.Message, Does.Contain("1 000"));
    }

    [TestCase("tag", false)]
    [TestCase("tag", true)]
    [TestCase("branch", false)]
    public void Wenn_Ref_wie_das_Praefix_von_c1_heisst_und_auf_c4_zeigt_dann_als_Argument_mehrdeutig_ohne_Eingabetext(string refArt, bool grossbuchstaben)
    {
        using var repo = WegwerfRepo.MitCommits("c1", "c2", "c3", "c4");
        var praefix = PraefixVon(repo.Hashes[0], grossbuchstaben);
        repo.Git(refArt, praefix, repo.Hashes[3]);

        var fehler = Assert.ThrowsAsync<AuswahlFehler>(() =>
            CommitsDerAuswahl.LesenAsync(Auswahl.AusEinzelcommits(new CommitHashes([praefix])), OhneStdin(), repo.Ordner, Protokoll(new StringWriter())));

        Assert.That(fehler.Message, Does.Contain("mehrdeutig"));
        Assert.That(fehler.Message, Does.Not.Contain(praefix).IgnoreCase);
    }

    [TestCase("tag", false)]
    [TestCase("tag", true)]
    [TestCase("branch", false)]
    public void Wenn_Ref_wie_das_Praefix_von_c1_heisst_und_auf_c4_zeigt_dann_ueber_stdin_mehrdeutig_ohne_Eingabetext(string refArt, bool grossbuchstaben)
    {
        using var repo = WegwerfRepo.MitCommits("c1", "c2", "c3", "c4");
        var praefix = PraefixVon(repo.Hashes[0], grossbuchstaben);
        repo.Git(refArt, praefix, repo.Hashes[3]);
        var stdin = new Standardeingabe(new StringReader($"{praefix}\n"), IstTerminal: false);

        var fehler = Assert.ThrowsAsync<AuswahlFehler>(() =>
            CommitsDerAuswahl.LesenAsync(Auswahl.UeberStdin(), stdin, repo.Ordner, Protokoll(new StringWriter())));

        Assert.That(fehler.Message, Does.Contain("mehrdeutig"));
        Assert.That(fehler.Message, Does.Not.Contain(praefix).IgnoreCase);
    }

    [Test]
    public async Task Wenn_voller_Hash_und_eindeutiges_Praefix_ohne_gleichnamige_Ref_dann_der_richtige_Commit()
    {
        using var repo = WegwerfRepo.MitCommits("c1", "c2", "c3", "c4");
        repo.Git("tag", repo.Hashes[0], repo.Hashes[3]);
        var eindeutigesPraefix = PraefixVon(repo.Hashes[1], grossbuchstaben: true);

        var ueberArgumente = await CommitsDerAuswahl.LesenAsync(
            Auswahl.AusEinzelcommits(new CommitHashes([repo.Hashes[0], eindeutigesPraefix])), OhneStdin(), repo.Ordner, Protokoll(new StringWriter()));
        var stdin = new Standardeingabe(new StringReader($"{repo.Hashes[0]}\n{eindeutigesPraefix}\n"), IstTerminal: false);
        var ueberStdin = await CommitsDerAuswahl.LesenAsync(Auswahl.UeberStdin(), stdin, repo.Ordner, Protokoll(new StringWriter()));

        var erwartet = new[] { repo.Hashes[0], repo.Hashes[1] };
        Assert.That(ueberArgumente.AlsArray().Select(zeile => zeile.Hash), Is.EqualTo(erwartet));
        Assert.That(ueberStdin.AlsArray().Select(zeile => zeile.Hash), Is.EqualTo(erwartet));
    }

    private static string PraefixVon(string hash, bool grossbuchstaben)
    {
        var praefix = hash[..4];
        if (grossbuchstaben)
        {
            return praefix.ToUpperInvariant();
        }
        return praefix;
    }

    private static Standardeingabe OhneStdin()
    {
        return new Standardeingabe(new ZaehlendeEingabe(), IstTerminal: false);
    }

    private static StderrProtokoll Protokoll(StringWriter ziel, Protokollstufe mindeststufe = Protokollstufe.Warnung)
    {
        return new StderrProtokoll(ziel, new TestUhr(Jetzt), mindeststufe);
    }

    private sealed class ZaehlendeEingabe : TextReader
    {
        public int Lesevorgaenge { get; private set; }

        public override int Read()
        {
            Lesevorgaenge++;
            return -1;
        }
    }
}
