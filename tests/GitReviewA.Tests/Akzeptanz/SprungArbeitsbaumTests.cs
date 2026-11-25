using System.Runtime.Versioning;
using GitReviewA.Fremdtext;
using GitReviewA.Git;
using GitReviewA.Sprung;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// B2004: der neue git-Lesepfad „Arbeitsbaum gegen Commit“ (`git diff --quiet`) erbt die Schutzoptionen der übrigen Lesepfade.
/// Proben: unverändert/geändert, aus dem Unterordner gestartet, Marker-Skripte der fremden Konfiguration, fremde Ausgabeeinstellungen,
/// kleine Ausgabegrenze und ein Name mit LF/CR, der nie an git geht. Ebene: Integration mit echtem git im Wegwerf-Repo.
/// </summary>
[Platform(Exclude = "Win", Reason = "Marker-Programme sind Shell-Skripte")]
[UnsupportedOSPlatform("windows")]
public class SprungArbeitsbaumTests
{
    private static readonly Ausgabegrenze KleineGrenze = new(1);

    [Test]
    public void Wenn_der_Arbeitsbaum_unveraendert_ist_dann_false()
    {
        using var repo = SprungRepo.S();

        var geaendert = GitLeser.ArbeitsbaumGeaendertLesen(repo.Hash("s2"), Datei("weg.txt"), repo.Ordner, Ausgabegrenze.Standard);

        Assert.That(geaendert, Is.False);
    }

    [Test]
    public void Wenn_die_Datei_seit_dem_Commit_geaendert_ist_dann_true()
    {
        using var repo = SprungRepo.S();
        File.WriteAllText(Path.Combine(repo.Ordner, "weg.txt"), "w1\nw2\nW3\n");

        var geaendert = GitLeser.ArbeitsbaumGeaendertLesen(repo.Hash("s2"), Datei("weg.txt"), repo.Ordner, Ausgabegrenze.Standard);

        Assert.That(geaendert, Is.True);
    }

    [Test]
    public void Wenn_der_Aufruf_aus_einem_Unterordner_startet_dann_derselbe_Befund()
    {
        using var repo = SprungRepo.S();
        var wurzelAusUnterordner = GitLeser.WurzelLesen(Path.Combine(repo.Ordner, "src"));

        var unveraendert = GitLeser.ArbeitsbaumGeaendertLesen(repo.Hash("s2"), Datei("src/a.txt"), wurzelAusUnterordner, Ausgabegrenze.Standard);

        Assert.That(wurzelAusUnterordner, Is.EqualTo(repo.Ordner));
        Assert.That(unveraendert, Is.False);
    }

    [Test]
    public void Wenn_das_Repo_Diff_Programme_setzt_dann_kein_Marker_und_derselbe_Befund()
    {
        using var repo = SprungRepo.SMitDiffProgrammen();

        var geaendert = GitLeser.ArbeitsbaumGeaendertLesen(repo.Hash("s2"), Datei("src/a.txt"), repo.Ordner, Ausgabegrenze.Standard);

        Assert.That(geaendert, Is.False);
        Assert.That(repo.VorhandeneMarker(), Is.Empty, "kein Diff-Programm des Repos lief");
        repo.Git("show", repo.Hash("s2"), "--", "src/a.txt");
        Assert.That(repo.VorhandeneMarker(), Does.Contain("marker-textconv"), "Kontrolle: git show ohne Schutz startet textconv");
    }

    [Test]
    public void Wenn_das_Repo_core_fsmonitor_setzt_dann_kein_Marker_und_derselbe_Befund()
    {
        using var repo = SprungRepo.SMitFsmonitor();
        var marker = Path.Combine(repo.Ordner, "marker-fsmonitor");

        var geaendert = GitLeser.ArbeitsbaumGeaendertLesen(repo.Hash("s2"), Datei("src/a.txt"), repo.Ordner, Ausgabegrenze.Standard);

        Assert.That(geaendert, Is.False);
        Assert.That(File.Exists(marker), Is.False, "core.fsmonitor des Repos lief");
        repo.Git("status", "--porcelain");
        Assert.That(File.Exists(marker), Is.True, "Kontrolle: git status startet core.fsmonitor");
    }

    [Test]
    public void Wenn_das_Repo_fremde_Ausgabeeinstellungen_setzt_dann_derselbe_Befund()
    {
        using var repo = SprungRepo.SMitFremdenEinstellungen();

        var geaendert = GitLeser.ArbeitsbaumGeaendertLesen(repo.Hash("s2"), Datei("src/a.txt"), repo.Ordner, Ausgabegrenze.Standard);

        Assert.That(geaendert, Is.False);
    }

    [Test]
    public void Wenn_die_Ausgabegrenze_klein_ist_dann_derselbe_Befund()
    {
        using var repo = SprungRepo.S();

        var geaendert = GitLeser.ArbeitsbaumGeaendertLesen(repo.Hash("s2"), Datei("src/a.txt"), repo.Ordner, KleineGrenze);

        Assert.That(geaendert, Is.False, "die Grenze ist gesetzt, der Aufruf ist ausgabefrei");
    }

    [Test]
    public void Wenn_der_Name_ein_LF_traegt_dann_GitFehler_noch_vor_git()
    {
        using var repo = SprungRepo.S();

        var fehler = Assert.Throws<GitFehler>(() => GitLeser.ArbeitsbaumGeaendertLesen(repo.Hash("s2"), Datei("harmlos\ngeheim.txt"), repo.Ordner, Ausgabegrenze.Standard));

        Assert.That(fehler!.Message, Does.Contain("abgewiesen"));
    }

    [Test]
    public void Wenn_der_Name_ein_CR_traegt_dann_GitFehler_noch_vor_git()
    {
        using var repo = SprungRepo.S();

        var fehler = Assert.Throws<GitFehler>(() => GitLeser.ArbeitsbaumGeaendertLesen(repo.Hash("s2"), Datei("a\rb.txt"), repo.Ordner, Ausgabegrenze.Standard));

        Assert.That(fehler!.Message, Does.Contain("abgewiesen"));
    }

    [Test]
    public void Wenn_der_Name_Rohbytes_traegt_dann_GitFehler_noch_vor_git()
    {
        using var repo = SprungRepo.S();
        var mitRohbytes = new Dateiaenderung("A", "f⟨0xFF⟩.txt", null, 1, 0, new Rohname([0x66, 0xFF, 0x2E, 0x74, 0x78, 0x74]));

        var fehler = Assert.Throws<GitFehler>(() => GitLeser.ArbeitsbaumGeaendertLesen(repo.Hash("s2"), mitRohbytes, repo.Ordner, Ausgabegrenze.Standard));

        Assert.That(fehler!.Message, Does.Contain("abgewiesen"));
    }

    [Test]
    public void Wenn_der_Hash_kein_Commit_ist_dann_GitFehler()
    {
        using var repo = SprungRepo.S();

        Assert.Throws<GitFehler>(() => GitLeser.ArbeitsbaumGeaendertLesen("0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f", Datei("src/a.txt"), repo.Ordner, Ausgabegrenze.Standard));
    }

    private static Dateiaenderung Datei(string pfad)
    {
        return new Dateiaenderung("M", pfad, null, 1, 1);
    }
}
