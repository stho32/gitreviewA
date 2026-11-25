using System.Runtime.Versioning;
using GitReviewA.Git;
using GitReviewA.Sprung;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// B2003: `GitSprungquelle` stellt fest, ob die Stelle im Arbeitsbaum liegt. Ein Symlink, dessen Ziel aus der Wurzel hinausführt,
/// gilt als „verlässt die Wurzel“ (kein Link), ein fehlender Pfad als „fehlt“. Ebene: Unit (Dateisystem) und Integration (Wegwerf-Repo S/L).
/// </summary>
[Platform(Exclude = "Win", Reason = "Symlinks und absolute Wurzelvergleiche unter Linux")]
[UnsupportedOSPlatform("windows")]
public class SprungvorhandenseinTests
{
    [Test]
    public void Wenn_die_Datei_da_ist_dann_vorhanden()
    {
        var ordner = EigenesVerzeichnis();
        try
        {
            File.WriteAllText(Path.Combine(ordner, "a.txt"), "eins\n");
            var quelle = new GitSprungquelle(ordner);

            var vorhanden = quelle.PruefeVorhandensein(Path.Combine(ordner, "a.txt"));

            Assert.That(vorhanden, Is.EqualTo(Sprungvorhandensein.Vorhanden));
        }
        finally
        {
            Loesche(ordner);
        }
    }

    [Test]
    public void Wenn_die_Datei_fehlt_dann_fehlt()
    {
        var ordner = EigenesVerzeichnis();
        try
        {
            var quelle = new GitSprungquelle(ordner);

            var vorhanden = quelle.PruefeVorhandensein(Path.Combine(ordner, "weg.txt"));

            Assert.That(vorhanden, Is.EqualTo(Sprungvorhandensein.Fehlt));
        }
        finally
        {
            Loesche(ordner);
        }
    }

    [Test]
    public void Wenn_ein_Symlink_aus_der_Wurzel_hinausfuehrt_dann_verlaesst_die_Wurzel()
    {
        var ordner = EigenesVerzeichnis();
        try
        {
            File.CreateSymbolicLink(Path.Combine(ordner, "link.txt"), "/etc/hostname");
            var quelle = new GitSprungquelle(ordner);

            var vorhanden = quelle.PruefeVorhandensein(Path.Combine(ordner, "link.txt"));

            Assert.That(vorhanden, Is.EqualTo(Sprungvorhandensein.VerlaesstWurzel));
        }
        finally
        {
            Loesche(ordner);
        }
    }

    [Test]
    public void Wenn_ein_Symlink_in_der_Wurzel_bleibt_dann_vorhanden()
    {
        var ordner = EigenesVerzeichnis();
        try
        {
            File.WriteAllText(Path.Combine(ordner, "inhalt.txt"), "eins\n");
            File.CreateSymbolicLink(Path.Combine(ordner, "kurz.txt"), "inhalt.txt");
            var quelle = new GitSprungquelle(ordner);

            var vorhanden = quelle.PruefeVorhandensein(Path.Combine(ordner, "kurz.txt"));

            Assert.That(vorhanden, Is.EqualTo(Sprungvorhandensein.Vorhanden));
        }
        finally
        {
            Loesche(ordner);
        }
    }

    [Test]
    public void Wenn_ein_Symlink_ins_Leere_innerhalb_der_Wurzel_zeigt_dann_fehlt()
    {
        var ordner = EigenesVerzeichnis();
        try
        {
            File.CreateSymbolicLink(Path.Combine(ordner, "kaputt.txt"), "gibt-es-nicht.txt");
            var quelle = new GitSprungquelle(ordner);

            var vorhanden = quelle.PruefeVorhandensein(Path.Combine(ordner, "kaputt.txt"));

            Assert.That(vorhanden, Is.EqualTo(Sprungvorhandensein.Fehlt));
        }
        finally
        {
            Loesche(ordner);
        }
    }

    [Test]
    public void Wenn_ein_Symlink_auf_ein_fehlerndes_Ziel_ausserhalb_zeigt_dann_verlaesst_die_Wurzel()
    {
        var ordner = EigenesVerzeichnis();
        try
        {
            File.CreateSymbolicLink(Path.Combine(ordner, "raus.txt"), "/gibt-es-nicht-12345");
            var quelle = new GitSprungquelle(ordner);

            var vorhanden = quelle.PruefeVorhandensein(Path.Combine(ordner, "raus.txt"));

            Assert.That(vorhanden, Is.EqualTo(Sprungvorhandensein.VerlaesstWurzel), "das Ziel liegt außerhalb, auch wenn es fehlt");
        }
        finally
        {
            Loesche(ordner);
        }
    }

    [Test]
    public void Wenn_die_Datei_im_Arbeitsbaum_entfernt_ist_dann_fehlt_auch_im_Repo_S()
    {
        using var repo = SprungRepo.S();
        var quelle = new GitSprungquelle(repo.Ordner);
        var datei = new Dateiaenderung("M", "weg.txt", null, 1, 1);
        var pfad = Sprungpfad.Bilde(datei, repo.Ordner).AbsoluterPfad!;
        File.Delete(pfad);

        var vorhanden = quelle.PruefeVorhandensein(pfad);

        Assert.That(vorhanden, Is.EqualTo(Sprungvorhandensein.Fehlt));
    }

    [Test]
    public void Wenn_der_Symlink_im_Repo_L_aus_der_Wurzel_fuehrt_dann_verlaesst_die_Wurzel()
    {
        using var repo = SprungRepo.L();
        var quelle = new GitSprungquelle(repo.Ordner);
        var datei = new Dateiaenderung("A", "link.txt", null, 1, 0);
        var pfad = Sprungpfad.Bilde(datei, repo.Ordner).AbsoluterPfad!;

        var vorhanden = quelle.PruefeVorhandensein(pfad);

        Assert.That(vorhanden, Is.EqualTo(Sprungvorhandensein.VerlaesstWurzel));
        Assert.That(quelle.Repositorywurzel, Is.EqualTo(repo.Ordner));
    }

    private static string EigenesVerzeichnis()
    {
        return Directory.CreateTempSubdirectory("gitreviewa-sprung-").FullName;
    }

    private static void Loesche(string ordner)
    {
        Directory.Delete(ordner, recursive: true);
    }
}
