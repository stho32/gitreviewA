using System.Runtime.Versioning;
using GitReviewA.Bild;
using GitReviewA.Fremdtext;
using GitReviewA.Git;
using GitReviewA.Tests.Akzeptanz;

namespace GitReviewA.Tests.Bild;

/// <summary>B2304: den Blob einer Seite über `GitStart` lesen — mit Ausgabegrenze und Namensprüfung an der Aufrufstelle (Lehre #10).</summary>
[UnsupportedOSPlatform("windows")]
internal sealed class BildinhaltLesenTests
{
    [Test]
    public void Wenn_nachher_dann_die_Bytes_des_Commits()
    {
        using var repo = BildRepo.V();

        var bytes = Quelle(repo).Lesen(repo.Hash("q"), Datei(repo, "q", "bilder/logo.png"), Bildseite.Nachher).Bytes;

        Assert.That(bytes, Is.EqualTo(BildRepo.Bytes(BildRepo.Png2)));
    }

    [Test]
    public void Wenn_vorher_dann_die_Bytes_des_ersten_Elternteils()
    {
        using var repo = BildRepo.V();

        var bytes = Quelle(repo).Lesen(repo.Hash("q"), Datei(repo, "q", "bilder/logo.png"), Bildseite.Vorher).Bytes;

        Assert.That(bytes, Is.EqualTo(BildRepo.Bytes(BildRepo.Png1)));
    }

    [Test]
    public void Wenn_eine_Umbenennung_dann_vorher_am_alten_Pfad()
    {
        using var repo = BildRepo.V();

        var bytes = Quelle(repo).Lesen(repo.Hash("q"), Datei(repo, "q", "bilder/umbenannt.png"), Bildseite.Vorher).Bytes;

        Assert.That(bytes, Is.EqualTo(BildRepo.Bytes(BildRepo.PngAlt)));
    }

    [Test]
    public void Wenn_Name_mit_Rohbyte_dann_geht_er_ueber_stdin_an_git()
    {
        using var repo = BildRepo.V();

        var bytes = Quelle(repo).Lesen(repo.Hash("q"), Datei(repo, "q", "bilder/b⟨0xFF⟩.png"), Bildseite.Nachher).Bytes;

        Assert.That(bytes, Is.EqualTo(BildRepo.Bytes(BildRepo.Png1)));
    }

    [Test]
    public void Wenn_unter_der_Grenze_dann_ganze_Bytes()
    {
        using var repo = BildRepo.V();
        var grenze = new Ausgabegrenze(BildRepo.Bytes(BildRepo.PngGross).Length);

        var bytes = new GitBildquelle(Wurzel(repo), grenze).Lesen(repo.Hash("q"), Datei(repo, "q", "bilder/gross.png"), Bildseite.Nachher).Bytes;

        Assert.That(bytes, Is.EqualTo(BildRepo.Bytes(BildRepo.PngGross)));
    }

    [Test]
    public void Wenn_ueber_der_Grenze_dann_der_Anfang_mit_der_ueberschrittenen_Grenze()
    {
        using var repo = BildRepo.V();
        var grenze = new Ausgabegrenze(BildRepo.Bytes(BildRepo.PngGross).Length - 1);
        var quelle = new GitBildquelle(Wurzel(repo), grenze);

        var inhalt = quelle.Lesen(repo.Hash("q"), Datei(repo, "q", "bilder/gross.png"), Bildseite.Nachher);

        Assert.That(inhalt.UeberschritteneGrenze, Is.EqualTo(grenze), "die Grenze wird gemeldet, nicht geworfen");
        Assert.That(inhalt.Bytes, Is.EqualTo(BildRepo.Bytes(BildRepo.PngGross).Take((int)grenze.Bytes)), "gelesen ist der Anfang bis zur Grenze");
    }

    [Test]
    public void Wenn_Name_mit_Zeilenende_dann_wird_er_nicht_an_git_gegeben()
    {
        using var repo = BildRepo.V();
        var rohname = new Rohname([0x61, (byte)'\n', 0x62]);

        Assert.Throws<GitFehler>(() => GitLeser.BlobLesen(repo.Hash("q"), "x", rohname, Wurzel(repo), Ausgabegrenze.Standard));
    }

    [Test]
    public void Wenn_fremde_Diff_Konfiguration_dann_gleiche_Bytes_und_keine_Markerdatei()
    {
        using var repo = BildRepo.VMitFremderDiffKonfiguration();

        var bytes = Quelle(repo).Lesen(repo.Hash("q"), Datei(repo, "q", "bilder/logo.png"), Bildseite.Nachher).Bytes;

        Assert.That(bytes, Is.EqualTo(BildRepo.Bytes(BildRepo.Png2)));
        Assert.That(repo.VorhandeneMarker(), Is.Empty);
    }

    [Test]
    public void Wenn_Start_aus_einem_Unterordner_dann_gleiche_Bytes()
    {
        using var repo = BildRepo.V();
        var ausUnterordner = GitLeser.WurzelLesen(Path.Combine(repo.Ordner, "bilder"));

        var bytes = new GitBildquelle(ausUnterordner).Lesen(repo.Hash("q"), Datei(repo, "q", "bilder/logo.png"), Bildseite.Nachher).Bytes;

        Assert.That(bytes, Is.EqualTo(BildRepo.Bytes(BildRepo.Png2)));
    }

    private static GitBildquelle Quelle(BildRepo repo)
    {
        return new GitBildquelle(Wurzel(repo));
    }

    private static string Wurzel(BildRepo repo)
    {
        return GitLeser.WurzelLesen(repo.Ordner);
    }

    private static Dateiaenderung Datei(BildRepo repo, string commit, string pfad)
    {
        var dateien = GitLeser.DateienLesen(repo.Hash(commit), Wurzel(repo));
        for (var stelle = 0; stelle < dateien.Anzahl; stelle++)
        {
            if (dateien[stelle].Pfad == pfad)
            {
                return dateien[stelle];
            }
        }
        throw new InvalidOperationException($"Datei {pfad} fehlt im Commit {commit}");
    }
}
