using System.Runtime.Versioning;
using GitReviewA.Git;
using GitReviewA.Tests.Akzeptanz;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Zusammen;

/// <summary>
/// B1403: die Netto-Änderungen der lückenlosen Kette gegen echtes git. Das Orakel ist der Unterschied zur Summe der per-Commit-Listen
/// (`src/b.txt` netto +2 −0, als Summe +3 −1) — die Probe unterscheidet netto von „Abschnitte addiert“.
/// </summary>
[Platform(Exclude = "Win", Reason = "Marker-Programm ist ein Shell-Skript")]
[UnsupportedOSPlatform("windows")]
public class NettoAenderungenLesenTests
{
    [Test]
    [Description("R00015 B1403: netto über die lückenlose Kette, jede Datei einmal")]
    public void Wenn_die_Kette_lueckenlos_ist_dann_die_Netto_Aenderungen_gegen_den_Elternstand()
    {
        using var z = ZusammenRepo.Z();

        var netto = AlsNamen(GitLeser.NettoDateienLesen("", z.Hash("z3"), z.Ordner));

        Assert.That(netto, Is.EqualTo(new[]
        {
            ("A", "README.md", (string?)null, (int?)2, (int?)0),
            ("A", "src/a.txt", (string?)null, (int?)4, (int?)0),
            ("A", "src/b.txt", (string?)null, (int?)2, (int?)0),
        }));
    }

    [Test]
    [Description("R00015 B1403: netto ist nicht die Summe der Abschnitte")]
    public void Wenn_die_Summe_der_Abschnitte_anders_waere_dann_zaehlt_netto()
    {
        using var z = ZusammenRepo.Z();

        var netto = GitLeser.NettoDateienLesen("", z.Hash("z3"), z.Ordner);
        var summe = SummeDerPerCommitListen(z, "z1", "z2", "z3");

        Assert.That(Plus(netto, "src/a.txt"), Is.EqualTo(4));
        Assert.That(Minus(netto, "src/a.txt"), Is.EqualTo(0));
        Assert.That(Plus(summe, "src/a.txt"), Is.EqualTo(5), "Kontrolle: als Summe wären es +5 −1");
        Assert.That(Minus(summe, "src/a.txt"), Is.EqualTo(1));
        Assert.That((Plus(netto, "src/b.txt"), Minus(netto, "src/b.txt")), Is.EqualTo((2, 0)));
        Assert.That((Plus(summe, "src/b.txt"), Minus(summe, "src/b.txt")), Is.EqualTo((3, 1)));
    }

    [Test]
    [Description("R00015 B1403: eine Umbenennung trägt ihren alten Pfad, der Basis des Nicht-Wurzel-Commits zufolge")]
    public void Wenn_in_der_Kette_umbenannt_wird_dann_traegt_die_Datei_den_alten_Pfad()
    {
        using var z = ZusammenRepo.Umbenennung();

        var netto = GitLeser.NettoDateienLesen(z.Hash("z1"), z.Hash("u"), z.Ordner);

        var datei = netto.AlsArray().Single();
        Assert.That((datei.Status, datei.Pfad, datei.AlterPfad, datei.Plus, datei.Minus), Is.EqualTo(("R", "neu.txt", "alt.txt", 1, 1)));
    }

    [Test]
    [Description("R00015 B1403, Kriterium 11: das fremde Repo startet über die Netto-Änderungen kein Programm, Start aus einem Unterordner")]
    public void Wenn_der_Lauf_aus_einem_Unterordner_kommt_und_Programme_konfiguriert_sind_dann_die_Netto_Aenderungen_ohne_Programm()
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
        z.Git("config", "diff.context", "0");
        var wurzel = GitLeser.WurzelLesen(Path.Combine(z.Ordner, "src"));

        var netto = AlsNamen(GitLeser.NettoDateienLesen("", z.Hash("z3"), wurzel));

        Assert.That(netto, Is.EqualTo(new[]
        {
            ("A", "README.md", (string?)null, (int?)2, (int?)0),
            ("A", "src/a.txt", (string?)null, (int?)4, (int?)0),
            ("A", "src/b.txt", (string?)null, (int?)2, (int?)0),
        }));
        Assert.That(File.Exists(marker), Is.False, "das Programm aus der Konfiguration des Repos lief");
        z.Git("diff", z.Hash("z1"), z.Hash("z3"));
        Assert.That(File.Exists(marker), Is.True, "Kontrolle: das Marker-Programm ist über git diff aufrufbar");
    }

    private static Dateiaenderungen SummeDerPerCommitListen(ZusammenRepo z, params string[] commits)
    {
        var summe = new Dictionary<string, (int? Plus, int? Minus)>(StringComparer.Ordinal);
        foreach (var commit in commits)
        {
            foreach (var datei in GitLeser.DateienLesen(z.Hash(commit), z.Ordner))
            {
                var bisher = summe.TryGetValue(datei.Pfad, out var wert) ? wert : (Plus: (int?)0, Minus: (int?)0);
                summe[datei.Pfad] = (bisher.Plus + datei.Plus, bisher.Minus + datei.Minus);
            }
        }
        return new Dateiaenderungen(summe.Select(eintrag => new Dateiaenderung("M", eintrag.Key, null, eintrag.Value.Plus, eintrag.Value.Minus)));
    }

    private static int? Plus(Dateiaenderungen aenderungen, string pfad)
    {
        return aenderungen.AlsArray().Single(datei => datei.Pfad == pfad).Plus;
    }

    private static int? Minus(Dateiaenderungen aenderungen, string pfad)
    {
        return aenderungen.AlsArray().Single(datei => datei.Pfad == pfad).Minus;
    }

    private static (string Status, string Pfad, string? AlterPfad, int? Plus, int? Minus)[] AlsNamen(Dateiaenderungen aenderungen)
    {
        return aenderungen.AlsArray().Select(datei => (datei.Status, datei.Pfad, datei.AlterPfad, datei.Plus, datei.Minus)).ToArray();
    }
}
