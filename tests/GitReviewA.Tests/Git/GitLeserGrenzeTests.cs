using GitReviewA.Aufruf;
using GitReviewA.Diff;
using GitReviewA.Git;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Git;

/// <summary>
/// B4402 (R00048 Kriterium 8): jeder Leser des <see cref="GitLeser"/> liest über die Ausgabegrenze — über der Grenze endet er mit
/// dem Ausgang „zu groß“ (<see cref="GitZuGross"/>), darunter ganz. Die Grenze ist je Aufrufer einstellbar (Testparameter, kein
/// Produktwert). Ebene: Integration mit echtem `git` im Wegwerf-Repo.
/// </summary>
[Platform(Exclude = "Win", Reason = "Wegwerf-Repos und git-Aufrufe")]
public class GitLeserGrenzeTests
{
    private const string Zeit = "2026-03-04T09:15:00+01:00";

    [Test]
    [Description("Kriterium 8: die Tabelle der Leser — jeder endet über der Grenze mit „zu groß“")]
    public void Wenn_die_Grenze_unter_der_Ausgabe_liegt_dann_zu_gross_bei_jedem_Leser()
    {
        using var repo = WegwerfRepo.MitCommits("Erster Commit", "Zweiter Commit");
        var hash = repo.Hashes[1];
        var hashes = new CommitHashes([hash]);
        var winzig = new Ausgabegrenze(4);
        var datei = GitLeser.DateienLesen(hash, repo.Ordner, new Ausgabegrenze(4096)).AlsArray().Single();

        var leser = new (string Name, Action Lies)[]
        {
            ("Commit-Angaben", () => GitLeser.Lesen(hashes, repo.Ordner, winzig)),
            ("Elternfolge", () => GitLeser.ElternfolgeLesen(hashes, repo.Ordner, winzig)),
            ("Netto-Dateiliste", () => GitLeser.NettoDateienLesen(string.Empty, hash, repo.Ordner, winzig)),
            ("Dateiliste je Commit", () => GitLeser.DateienLesen(hash, repo.Ordner, winzig)),
            ("Übersicht", () => GitLeser.UebersichtLesen(hashes, repo.Ordner, winzig)),
            ("Bereich", () => GitLeser.LeseBereiche(new Bereiche([$"{repo.Hashes[0]}..HEAD"]), repo.Ordner, winzig)),
            ("Diff-Attribut", () => GitLeser.DiffAttributLesen(datei, repo.Ordner, winzig)),
            ("Wurzel", () => GitLeser.WurzelLesen(repo.Ordner, winzig)),
            ("nacktes Repo", () => GitLeser.IstNacktesRepository(repo.Ordner, winzig)),
            ("Diff", () => GitLeser.DiffLesen(hash, datei, Diffumfang.Aenderungen, repo.Ordner, winzig)),
        };

        foreach (var (name, lies) in leser)
        {
            Assert.Throws<GitZuGross>(() => lies(), $"Leser {name}");
        }
    }

    [Test]
    [Description("Kriterium 8: unter der Grenze wird ganz gelesen — die Kontrolle zur Tabelle")]
    public void Wenn_die_Grenze_ueber_der_Ausgabe_liegt_dann_ganz_gelesen()
    {
        using var repo = WegwerfRepo.MitCommits("Erster Commit", "Zweiter Commit");
        var hash = repo.Hashes[1];
        var hashes = new CommitHashes([hash]);
        var gross = new Ausgabegrenze(1_000_000);

        var commits = GitLeser.Lesen(hashes, repo.Ordner, gross);
        var dateien = GitLeser.DateienLesen(hash, repo.Ordner, gross);

        Assert.That(commits.Anzahl, Is.EqualTo(1));
        Assert.That(commits.AlsArray().Single().Betreff, Is.EqualTo("Zweiter Commit"));
        Assert.That(dateien.Anzahl, Is.EqualTo(1));
    }

    [Test]
    [Description("Kriterium 5 als Spanne: 3 KiB Message gelesen, 5 KiB und 7 KiB über der Grenze von 4 KiB (Mutanten ignoriert, ×2, /2)")]
    public void Wenn_die_Message_knapp_unter_und_ueber_der_Grenze_liegt_dann_spanne()
    {
        var grenze = new Ausgabegrenze(4096);

        using var klein = MitMessage(3 * 1024, out var kleinHash);
        var gelesen = GitLeser.Lesen(new CommitHashes([kleinHash]), klein.Ordner, grenze);

        Assert.That(gelesen.Anzahl, Is.EqualTo(1), "3 KiB Message passt in 4 KiB");
        Assert.That(gelesen.AlsArray().Single().Rumpf.Length, Is.EqualTo(3 * 1024), "die ganze Message, nichts gekürzt");

        using var mittel = MitMessage(5 * 1024, out var mittelHash);
        Assert.Throws<GitZuGross>(() => GitLeser.Lesen(new CommitHashes([mittelHash]), mittel.Ordner, grenze), "5 KiB über der Grenze");

        using var gross = MitMessage(7 * 1024, out var grossHash);
        Assert.Throws<GitZuGross>(() => GitLeser.Lesen(new CommitHashes([grossHash]), gross.Ordner, grenze), "7 KiB über der Grenze (tötet den Mutanten „Grenze × 2“)");
    }

    [Test]
    [Description("Kriterium 8: die Ausgabegrenze greift auch beim Lesen mit Eingabe über stdin (Hash und Name)")]
    public void Wenn_der_Leser_mit_Eingabe_laeuft_dann_gilt_dieselbe_Grenze()
    {
        using var repo = WegwerfRepo.MitCommits("Erster Commit", "Zweiter Commit");
        var hash = repo.Hashes[1];
        var datei = GitLeser.DateienLesen(hash, repo.Ordner, new Ausgabegrenze(4096)).AlsArray().Single();

        Assert.Throws<GitZuGross>(() => GitLeser.NettoDiffLesen(string.Empty, hash, datei, Diffumfang.Aenderungen, repo.Ordner, new Ausgabegrenze(4), Leerraum.Beachten));
    }

    /// <summary>Ein Repo mit einem Commit, dessen Message <paramref name="groesse"/> Byte Rumpf trägt.</summary>
    private static WegwerfRepo MitMessage(int groesse, out string hash)
    {
        var repo = WegwerfRepo.MitCommits();
        var datei = Path.Combine(repo.Ordner, "..", $".nachricht-{Guid.NewGuid():N}.txt");
        File.WriteAllText(datei, "Betreff\n\n" + new string('m', groesse) + "\n");
        try
        {
            hash = repo.CommitteAusDatei(datei, "Anna Beispiel", Zeit);
        }
        finally
        {
            File.Delete(datei);
        }
        return repo;
    }
}
