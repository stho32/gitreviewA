using System.Runtime.Versioning;
using GitReviewA.Sprung;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// B2005/R00021: die Akzeptanzkriterien der Gruppen „Sprungziel je Stelle“ (das Ziel ohne Zeile), „Hinweis und fehlende Datei“ und
/// „Fremde Namen, Wurzel und der neue git-Aufruf“ gegen den <see cref="SprungInteractor"/> mit echtem git im Wegwerf-Repo.
/// Ebene: Integration (Ziel je Stelle, Gründe, kein git-Aufruf bei abgewiesenen Pfaden).
/// </summary>
[Platform(Exclude = "Win", Reason = "Wegwerf-Repos, Symlinks und Namen aus fremden Bytes")]
[UnsupportedOSPlatform("windows")]
public class SprungR00021Tests
{
    [Test]
    public void Wenn_alles_gueltig_ist_dann_ziel_ohne_Zeile_und_unveraendert()
    {
        using var repo = SprungRepo.S();
        var sprache = SprungSprache.Aufruf(repo.Ordner, repo.Hash, "s1", "s2");

        var bild = sprache.Sprung("s2", "src/a.txt");

        Assert.That(bild, Is.EqualTo(new Sprungbild("beantwortet", Ziel(repo.Ordner, "src/a.txt"), false, "")));
    }

    [Test]
    public void Wenn_die_Datei_seit_dem_Commit_geaendert_ist_dann_geaendert_und_weiter_das_Ziel()
    {
        using var repo = SprungRepo.S();
        var sprache = SprungSprache.Aufruf(repo.Ordner, repo.Hash, "s1", "s2");
        Assert.That(sprache.Sprung("s2", "weg.txt").Geaendert, Is.False);

        File.WriteAllText(Path.Combine(repo.Ordner, "weg.txt"), "w1\nw2\nW3\n");

        var bild = sprache.Sprung("s2", "weg.txt");
        Assert.That(bild.Geaendert, Is.True);
        Assert.That(bild.Ziel, Is.EqualTo(Ziel(repo.Ordner, "weg.txt")));
    }

    [Test]
    public void Wenn_der_Name_Leerzeichen_und_Rauteck_traegt_dann_prozent_kodiertes_Ziel()
    {
        using var repo = SprungRepo.S();
        var sprache = SprungSprache.Aufruf(repo.Ordner, repo.Hash, "s1", "s2");

        var bild = sprache.Sprung("s1", "Ordner mit Leerzeichen/datei#1.txt");

        Assert.That(bild.Ziel, Is.EqualTo($"vscode://file{repo.Ordner}/Ordner%20mit%20Leerzeichen/datei%231.txt"));
    }

    [Test]
    public void Wenn_der_Name_ein_Prozent_traegt_dann_prozent_kodiertes_Ziel()
    {
        using var repo = SprungRepo.S();
        var sprache = SprungSprache.Aufruf(repo.Ordner, repo.Hash, "s1", "s2");

        var bild = sprache.Sprung("s1", "prozent%25.txt");

        Assert.That(bild.Ziel, Is.EqualTo($"vscode://file{repo.Ordner}/prozent%2525.txt"));
    }

    [Test]
    public void Wenn_die_Datei_im_Commit_geloescht_ist_dann_Grund_Datei_fehlt_ohne_Arbeitsbaumpruefung()
    {
        using var repo = SprungRepo.S();
        var sprache = SprungSprache.Aufruf(repo.Ordner, repo.Hash, "s1", "s2");

        var bild = sprache.Sprung("s2", "README.md");

        Assert.That(bild, Is.EqualTo(new Sprungbild("beantwortet", "", false, Sprunggruende.DateiFehlt)));
        Assert.That(sprache.Arbeitsbaumpruefungen, Is.Zero);
    }

    [Test]
    public void Wenn_die_Datei_aus_dem_Arbeitsbaum_entfernt_ist_dann_Grund_Datei_fehlt_ohne_Arbeitsbaumpruefung()
    {
        using var repo = SprungRepo.S();
        var sprache = SprungSprache.Aufruf(repo.Ordner, repo.Hash, "s1", "s2");
        File.Delete(Path.Combine(repo.Ordner, "src/a.txt"));

        var bild = sprache.Sprung("s2", "src/a.txt");

        Assert.That(bild, Is.EqualTo(new Sprungbild("beantwortet", "", false, Sprunggruende.DateiFehlt)));
        Assert.That(sprache.Arbeitsbaumpruefungen, Is.Zero);
    }

    [TestCase("nicht-da.txt")]
    [TestCase("../README.md")]
    [TestCase("--output=pwn")]
    [TestCase(":(top)src/a.txt")]
    [TestCase("*.txt")]
    [TestCase("SRC/A.TXT")]
    [TestCase("")]
    public void Wenn_der_Pfad_nicht_genau_in_der_Dateiliste_steht_dann_nicht_gefunden_ohne_Arbeitsbaumpruefung(string pfad)
    {
        using var repo = SprungRepo.S();
        var sprache = SprungSprache.Aufruf(repo.Ordner, repo.Hash, "s1", "s2");

        var bild = sprache.Sprung("s2", pfad);

        Assert.That(bild.Ausgang, Is.EqualTo("nicht gefunden"));
        Assert.That(sprache.Arbeitsbaumpruefungen, Is.Zero);
    }

    [TestCase("HEAD")]
    [TestCase("s1")]
    public void Wenn_der_Hash_nicht_zur_Aufrufmenge_gehoert_dann_nicht_gefunden(string hashOderName)
    {
        using var repo = SprungRepo.S();
        var sprache = SprungSprache.Aufruf(repo.Ordner, repo.Hash, "s2");

        var bild = sprache.Sprung(hashOderName, "src/a.txt");

        Assert.That(bild.Ausgang, Is.EqualTo("nicht gefunden"));
        Assert.That(sprache.Arbeitsbaumpruefungen, Is.Zero);
    }

    [Test]
    public void Wenn_ein_Name_ein_Rohbyte_oder_U202E_traegt_dann_Grund_nicht_uebergebbar_und_g_txt_hat_ein_Ziel()
    {
        using var repo = FremdeNamenRepo.AusSkript(SprungRepo.SkriptFremdeNamen, "f");
        var sprache = SprungSprache.Aufruf(repo.Ordner, repo.Hash, "f");

        var rohbyte = sprache.Sprung("f", "f⟨0xFF⟩.txt");
        var richtung = sprache.Sprung("f", "u\u202E.txt");
        var kontrolle = sprache.Sprung("f", "g.txt");

        Assert.That(rohbyte, Is.EqualTo(new Sprungbild("beantwortet", "", false, Sprunggruende.NameNichtUebergebbar)));
        Assert.That(richtung, Is.EqualTo(new Sprungbild("beantwortet", "", false, Sprunggruende.NameNichtUebergebbar)));
        Assert.That(kontrolle.Ziel, Is.EqualTo(Ziel(repo.Ordner, "g.txt")));
        Assert.That(sprache.Arbeitsbaumpruefungen, Is.EqualTo(1), "nur g.txt erreicht den Arbeitsbaum");
    }

    [Test]
    public void Wenn_ein_Symlink_aus_der_Wurzel_fuehrt_dann_Grund_Pfad_verlaesst_das_Repository()
    {
        using var repo = SprungRepo.L();
        var sprache = SprungSprache.Aufruf(repo.Ordner, repo.Hash, "l");

        var bild = sprache.Sprung("l", "link.txt");

        Assert.That(bild, Is.EqualTo(new Sprungbild("beantwortet", "", false, Sprunggruende.PfadVerlaesstRepository)));
        Assert.That(sprache.Arbeitsbaumpruefungen, Is.Zero);
    }

    [Test]
    public void Wenn_das_Repo_Diff_Programme_setzt_dann_dasselbe_Ziel_und_kein_Marker()
    {
        using var repo = SprungRepo.SMitDiffProgrammen();
        var sprache = SprungSprache.Aufruf(repo.Ordner, repo.Hash, "s1", "s2");

        var bild = sprache.Sprung("s2", "src/a.txt");

        Assert.That(bild.Ziel, Is.EqualTo(Ziel(repo.Ordner, "src/a.txt")));
        Assert.That(repo.VorhandeneMarker(), Is.Empty, "kein Diff-Programm des Repos lief");
    }

    [Test]
    public void Wenn_der_Aufruf_aus_einem_Unterordner_startet_dann_dasselbe_Ziel()
    {
        using var repo = SprungRepo.S();
        var sprache = SprungSprache.Aufruf(Path.Combine(repo.Ordner, "src"), repo.Hash, "s1", "s2");

        var bild = sprache.Sprung("s2", "src/a.txt");

        Assert.That(bild.Ziel, Is.EqualTo(Ziel(repo.Ordner, "src/a.txt")));
    }

    [Test]
    public void Wenn_die_Anfrage_gelingt_dann_steht_eine_Debugzeile_GET_sprung()
    {
        using var repo = SprungRepo.S();
        var sprache = SprungSprache.Aufruf(repo.Ordner, repo.Hash, "s1", "s2");

        sprache.Sprung("s2", "src/a.txt");

        Assert.That(sprache.Protokollzeilen(), Has.Some.Contains($"GET /api/commits/{repo.Hash("s2")}/sprung"));
    }

    private static string Ziel(string wurzel, string pfad)
    {
        return Sprungziel.Fuer(Path.Combine(wurzel, pfad));
    }
}
