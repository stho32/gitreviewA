using System.Runtime.Versioning;
using GitReviewA.Aufruf;
using GitReviewA.Git;
using GitReviewA.Tests.Akzeptanz;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Zusammen;

/// <summary>B1401: die Elternfolge der Auswahl gegen echtes git — Wurzel, mittlerer Commit, Spitze, ein einzelner Commit, ein Merge.</summary>
[Platform(Exclude = "Win", Reason = "Marker-Programm ist ein Shell-Skript")]
[UnsupportedOSPlatform("windows")]
public class ElternfolgeLesenTests
{
    [Test]
    [Description("R00015 B1401: die Reihenfolge im Aufruf bleibt, der erste Elternteil steht je Commit")]
    public void Wenn_die_Auswahl_gemischt_gelesen_wird_dann_je_Commit_sein_erster_Elternteil_in_Auswahlreihenfolge()
    {
        using var z = ZusammenRepo.Z();

        var inReihenfolge = Elternfolge(z, "z1", "z2", "z3");
        var gemischt = Elternfolge(z, "z3", "z1", "z2");

        Assert.That(inReihenfolge, Is.EqualTo(new[]
        {
            (z.Hash("z1"), ""), (z.Hash("z2"), z.Hash("z1")), (z.Hash("z3"), z.Hash("z2")),
        }));
        Assert.That(gemischt, Is.EqualTo(new[]
        {
            (z.Hash("z3"), z.Hash("z2")), (z.Hash("z1"), ""), (z.Hash("z2"), z.Hash("z1")),
        }));
    }

    [Test]
    [Description("R00015 B1401: ein einzelner Nicht-Wurzel-Commit trägt seinen Eltern-Hash")]
    public void Wenn_nur_ein_Nicht_Wurzel_Commit_gewaehlt_ist_dann_traegt_die_Elternfolge_seinen_Elternteil()
    {
        using var z = ZusammenRepo.Z();

        var folge = Elternfolge(z, "z2");

        Assert.That(folge, Is.EqualTo(new[] { (z.Hash("z2"), z.Hash("z1")) }));
    }

    [Test]
    [Description("R00015 B1401: ein Merge trägt seinen ersten Elternteil, nicht alle")]
    public void Wenn_ein_Merge_in_der_Auswahl_steht_dann_sein_erster_Elternteil()
    {
        using var m = DiffRepo.M();

        var folge = Elternfolge(m, "m");

        Assert.That(folge, Is.EqualTo(new[] { (m.Hash("m"), m.Hash("c2")) }));
    }

    [Test]
    [Description("R00015 B1401: das fremde Repo startet über die Elternfolge kein Programm")]
    public void Wenn_die_fremde_Konfiguration_ein_Diff_Programm_verlangt_dann_startet_die_Elternfolge_es_nicht()
    {
        using var z = ZusammenRepo.Z();
        var marker = Path.Combine(z.Ordner, ".git", "marker.txt");
        var programm = Path.Combine(z.Ordner, ".git", "marker.sh");
        File.WriteAllText(programm, $"#!/bin/sh\necho \"$@\" >> '{marker}'\n");
        File.SetUnixFileMode(programm, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        z.Git("config", "diff.external", programm);
        z.Git("config", "core.fsmonitor", programm);

        var folge = Elternfolge(z, "z1", "z2", "z3");

        Assert.That(folge, Has.Length.EqualTo(3));
        Assert.That(File.Exists(marker), Is.False, "das Programm aus der Konfiguration des Repos lief");
        z.Git("diff", z.Hash("z1"), z.Hash("z3"));
        Assert.That(File.Exists(marker), Is.True, "Kontrolle: das Marker-Programm ist über git diff aufrufbar");
    }

    private static (string Commit, string Eltern)[] Elternfolge(DiffRepo repo, params string[] commits)
    {
        return Elternfolge(repo.Ordner, commits.Select(repo.Hash));
    }

    private static (string Commit, string Eltern)[] Elternfolge(ZusammenRepo repo, params string[] commits)
    {
        return Elternfolge(repo.Ordner, commits.Select(repo.Hash));
    }

    private static (string Commit, string Eltern)[] Elternfolge(string ordner, IEnumerable<string> hashes)
    {
        var folge = GitLeser.ElternfolgeLesen(new CommitHashes(hashes), ordner);
        return folge.AlsArray().Select(zeile => (zeile.Commit, zeile.Eltern)).ToArray();
    }
}
