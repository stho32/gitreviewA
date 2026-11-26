using System.Runtime.Versioning;
using GitReviewA.Aufruf;
using GitReviewA.Git;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Die Szenarien 1–3 und 10–11 der User Story R00048 als Integrationstests gegen den Aufruf-Interactor mit echtem `git` im
/// Wegwerf-Repo (Repo F und Repo E): 0x1F/0x1E im Autor, im Betreff und im Rumpf, NUL in der Message, NUL im Autorkopf und
/// Umkodierung verschieben kein Feld. Ebene: Integration (Treiber in-process, <see cref="CommitSprache"/>).
/// </summary>
[Platform(Exclude = "Win", Reason = "Wegwerf-Repos und git-Aufrufe")]
[UnsupportedOSPlatform("windows")]
public class CommitFelderTests
{
    [Test]
    [Description("Kriterium 1 (Abnahme-Probe, F1/F2): 0x1F im Autor, Betreff und Rumpf verschiebt kein Feld")]
    public void Wenn_0x1F_im_Autor_und_Betreff_und_Rumpf_dann_felder_unverschoben()
    {
        using var f = CommitRepo.F();

        var t = CommitSprache.Lies(f.Ordner, CommitSprache.Einzelne(f.Hash("t"))).AlsArray().Single();

        Assert.That(t.Autor, Is.EqualTo("Anna\u001fBeispiel"), "heute rot: Autor „Anna“");
        Assert.That(t.Datum, Is.EqualTo("2026-03-04T09:15:00+01:00"), "heute rot: Datum „Beispiel“");
        Assert.That(t.Betreff, Is.EqualTo("Betreff\u001fmit Trenner"), "heute rot: Betreff ist das Datum");
        Assert.That(t.Rumpf, Is.EqualTo("Rumpf\u001fmit Trenner"));
    }

    [Test]
    [Description("Kriterium 2 (F3): jede der vier Auswahlarten liefert dieselben zwei Commits, u vor t")]
    public void Wenn_jede_Auswahlart_dann_dieselben_Felder_und_Reihenfolge()
    {
        using var f = CommitRepo.F();
        var p = f.Hash("p");
        var t = f.Hash("t");
        var u = f.Hash("u");
        var auswahlarten = new (string Name, Func<Commitzeilen> Lies)[]
        {
            ("u t", () => CommitSprache.Lies(f.Ordner, CommitSprache.Einzelne(u, t))),
            ("p..u", () => CommitSprache.Lies(f.Ordner, CommitSprache.AusBereichen($"{p}..{u}"))),
            ("p..t p..u", () => CommitSprache.Lies(f.Ordner, CommitSprache.AusBereichen($"{p}..{t}", $"{p}..{u}"))),
            ("stdin u t", () => CommitSprache.UeberStdin(f.Ordner, new StringWriter(), u, t).Commits!),
        };

        foreach (var (name, lies) in auswahlarten)
        {
            var commits = lies().AlsArray();
            Assert.That(commits.Select(zeile => zeile.Hash), Is.EqualTo(new[] { u, t }), $"Reihenfolge über {name}");
            Assert.That(commits[0].Autor, Is.EqualTo("Bernd\u001eBeispiel"), $"Autor über {name}");
            Assert.That(commits[0].Datum, Is.EqualTo("2026-03-05T18:30:00+01:00"), $"Datum über {name}");
            Assert.That(commits[0].Betreff, Is.EqualTo("Zweiter\u001e"), $"Betreff über {name}");
            Assert.That(commits[0].Rumpf, Is.EqualTo("Zeile eins\u001f\u001f\nZeile zwei"), $"Rumpf über {name}");
            Assert.That(commits[1].Autor, Is.EqualTo("Anna\u001fBeispiel"), $"Autor von t über {name}");
            Assert.That(commits[1].Betreff, Is.EqualTo("Betreff\u001fmit Trenner"), $"Betreff von t über {name}");
        }
    }

    [Test]
    [Description("Kriterium 3 (F5): NUL in der Message — der Lauf startet, git schneidet am NUL, kein Fehler")]
    public void Wenn_NUL_in_der_Message_dann_kein_Fehler_und_Betreff_vor_dem_NUL()
    {
        using var f = CommitRepo.F();

        var z = CommitSprache.Lies(f.Ordner, CommitSprache.Einzelne(f.Hash("z"))).AlsArray().Single();

        Assert.That(z.Autor, Is.EqualTo("Dora Beispiel"));
        Assert.That(z.Datum, Is.EqualTo("2026-03-05T09:40:00+01:00"));
        Assert.That(z.Betreff, Is.EqualTo("Vor dem NUL"));
        Assert.That(z.Rumpf, Is.Empty);
    }

    [Test]
    [Description("Kriterium 11 (L2, F6): NUL im Autorkopf — der Lauf startet, das Datum ist leer (nie „%aI“), die Felder stehen")]
    public void Wenn_NUL_im_Autorkopf_dann_Datum_leer_und_Felder_unverschoben()
    {
        using var f = CommitRepo.F();

        var commits = CommitSprache.Lies(f.Ordner, CommitSprache.Einzelne(f.Hash("n"))).AlsArray();

        Assert.That(commits, Has.Length.EqualTo(1));
        Assert.That(commits[0].Autor, Is.Empty, "git gibt %an leer aus");
        Assert.That(commits[0].Datum, Is.Empty, "nie der wörtliche Text %aI");
        Assert.That(commits[0].Betreff, Is.EqualTo("NUL im Autorkopf"));
    }

    [TestCase("utf16", "A", "2026-03-05T09:40:00+01:00", "H")]
    [TestCase("utf7", "A", "2026-03-05T09:40:00+01:00", "Betreff+ACA-")]
    [TestCase("latin1", "A", "2026-03-05T09:40:00+01:00", "Grüße é")]
    [Description("Kriterium 12 (L3): Umkodierung ergibt je genau fünf Felder, unverschoben")]
    public void Wenn_Kopf_umkodiert_ist_dann_genau_fuenf_Felder(string name, string autor, string datum, string betreff)
    {
        using var e = CommitRepo.E();

        var zeile = CommitSprache.Lies(e.Ordner, CommitSprache.Einzelne(e.Hash(name))).AlsArray().Single();

        Assert.That(zeile.Autor, Is.EqualTo(autor));
        Assert.That(zeile.Datum, Is.EqualTo(datum));
        Assert.That(zeile.Betreff, Is.EqualTo(betreff));
    }
}
