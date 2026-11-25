using System.Runtime.Versioning;
using GitReviewA.Diff;
using GitReviewA.Git;
using GitReviewA.Tests.Akzeptanz;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Zusammen;

/// <summary>
/// B1405: den Netto-Diff einer Datei über die Kette gegen echtes git. Revisionen und Pfade gehen über stdin (`git diff --stdin`);
/// geprüft werden die vier hinzugefügten Zeilen von `src/a.txt`, eine hinzugefügte Datei gegen den leeren Baum, eine Umbenennung
/// über beide Pfade und die Marker-Probe der fremden Konfiguration.
/// </summary>
[Platform(Exclude = "Win", Reason = "Marker-Programm ist ein Shell-Skript")]
[UnsupportedOSPlatform("windows")]
public class NettoDiffLesenTests
{
    [Test]
    [Description("R00015 B1405, Kriterium 4: netto vier hinzugefügte Zeilen, keine entfernte")]
    public void Wenn_der_Netto_Diff_einer_Datei_angefragt_wird_dann_der_Patch_gegen_den_Elternstand()
    {
        using var z = ZusammenRepo.Z();

        var patch = Diffaufbereitung.PatchAbErstemHunk(GitLeser.NettoDiffLesen("", z.Hash("z3"), Datei(z, "", "z3", "src/a.txt"), Diffumfang.Aenderungen, z.Ordner, Ausgabegrenze.Standard, Leerraum.Beachten));

        Assert.That(patch.Split('\n').Where(zeile => zeile.StartsWith('+')).Select(zeile => zeile[1..]),
            Is.EqualTo(new[] { "eins", "ZWEI", "drei", "vier" }));
        Assert.That(patch.Split('\n').Where(zeile => zeile.StartsWith('-')), Is.Empty, "die Zeile zwei aus z1 kommt nicht vor");
    }

    [Test]
    [Description("R00015 B1405: eine im Lauf der Kette hinzugefügte Datei kommt gegen den leeren Baum")]
    public void Wenn_die_Datei_erst_im_Lauf_der_Kette_entstand_dann_der_Patch_gegen_den_leeren_Baum()
    {
        using var z = ZusammenRepo.Z();

        var patch = Diffaufbereitung.PatchAbErstemHunk(GitLeser.NettoDiffLesen("", z.Hash("z3"), Datei(z, "", "z3", "README.md"), Diffumfang.Aenderungen, z.Ordner, Ausgabegrenze.Standard, Leerraum.Beachten));

        Assert.That(patch.Split('\n').Where(zeile => zeile.StartsWith('+')).Select(zeile => zeile[1..]), Is.EqualTo(new[] { "Lager", "Beispiel" }));
    }

    [Test]
    [Description("R00015 B1405: eine Umbenennung läuft über beide Pfade")]
    public void Wenn_die_Datei_umbenannt_wurde_dann_der_Netto_Diff_ueber_beide_Pfade()
    {
        using var z = ZusammenRepo.Umbenennung();

        var patch = Diffaufbereitung.PatchAbErstemHunk(GitLeser.NettoDiffLesen(z.Hash("z1"), z.Hash("u"), Datei(z, "z1", "u", "neu.txt"), Diffumfang.Aenderungen, z.Ordner, Ausgabegrenze.Standard, Leerraum.Beachten));

        Assert.That(patch.Split('\n').Where(zeile => zeile.StartsWith('-')).Select(zeile => zeile[1..]), Is.EqualTo(new[] { "a2" }));
        Assert.That(patch.Split('\n').Where(zeile => zeile.StartsWith('+')).Select(zeile => zeile[1..]), Is.EqualTo(new[] { "A2" }));
    }

    [Test]
    [Description("R00015 B1405, Kriterium 11: das fremde Repo startet über den Netto-Diff kein Programm")]
    public void Wenn_die_fremde_Konfiguration_ein_Diff_Programm_verlangt_dann_startet_der_Netto_Diff_es_nicht()
    {
        using var z = ZusammenRepo.Z();
        var marker = Path.Combine(z.Ordner, ".git", "marker.txt");
        var programm = Path.Combine(z.Ordner, ".git", "marker.sh");
        File.WriteAllText(programm, $"#!/bin/sh\necho \"$@\" >> '{marker}'\ncat \"$1\" 2>/dev/null\n");
        File.SetUnixFileMode(programm, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        z.LegeDateiAn(".gitattributes", "*.txt diff=x\n");
        z.Git("config", "diff.external", programm);
        z.Git("config", "diff.x.textconv", programm);
        z.Git("config", "diff.x.command", programm);

        var patch = GitLeser.NettoDiffLesen("", z.Hash("z3"), Datei(z, "", "z3", "src/a.txt"), Diffumfang.Aenderungen, z.Ordner, Ausgabegrenze.Standard, Leerraum.Beachten);

        Assert.That(patch, Does.Contain("+vier"));
        Assert.That(File.Exists(marker), Is.False, "das Programm aus der Konfiguration des Repos lief");
        z.Git("diff", z.Hash("z1"), z.Hash("z3"));
        Assert.That(File.Exists(marker), Is.True, "Kontrolle: das Marker-Programm ist über git diff aufrufbar");
    }

    [Test]
    [Description("Nacharbeit I0027 / R00026 B2501: -w hängt am selben `git diff --stdin`-Aufruf; eine reine Leerraum-Änderung bleibt leer")]
    public void Wenn_der_Netto_Diff_mit_ignoriertem_Leerraum_gelesen_wird_dann_bleibt_die_reine_Leerraum_Aenderung_leer()
    {
        using var z = ZusammenRepo.Leerraum();
        var datei = Datei(z, "z1", "z2", "still.txt");

        var beachten = GitLeser.NettoDiffLesen(z.Hash("z1"), z.Hash("z2"), datei, Diffumfang.Aenderungen, z.Ordner, Ausgabegrenze.Standard, Leerraum.Beachten);
        var ignorieren = GitLeser.NettoDiffLesen(z.Hash("z1"), z.Hash("z2"), datei, Diffumfang.Aenderungen, z.Ordner, Ausgabegrenze.Standard, Leerraum.Ignorieren);

        Assert.That(Diffaufbereitung.PatchAbErstemHunk(beachten), Does.Contain("-b").And.Contain("+  b"));
        Assert.That(Diffaufbereitung.PatchAbErstemHunk(ignorieren), Is.Empty, "-w blendet die reine Einrückungsänderung aus");
    }

    /// <summary>Die Netto-Änderung der Datei — genau die, die der Interactor an den Diff gibt.</summary>
    private static Dateiaenderung Datei(ZusammenRepo z, string basis, string spitze, string pfad)
    {
        var basisHash = basis.Length == 0 ? "" : z.Hash(basis);
        return GitLeser.NettoDateienLesen(basisHash, z.Hash(spitze), z.Ordner).AlsArray().Single(datei => datei.Pfad == pfad);
    }
}
