using System.Runtime.Versioning;
using GitReviewA.Git;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Spezifikation R00017 „Große Diffs“, Kriterien der Ausgabegrenze (Szenario 6 der User Story): der Server liest die Ausgabe von `git`
/// nur bis zur Bytegrenze und meldet darüber den Ausgang „zu groß“ — nie einen gekürzten Patch. Ebene: Integration gegen den
/// <see cref="GitReviewA.Diff.DiffLesenInteractor"/> mit echtem `git` im Wegwerf-Repo; die Oberfläche prüft `e2e`.
/// </summary>
[Platform(Exclude = "Win", Reason = "Marker-Programme sind Shell-Skripte")]
[UnsupportedOSPlatform("windows")]
public class GrosseDiffsTests
{
    private static Ausgabegrenze Klein()
    {
        return new Ausgabegrenze(1024);
    }

    [Test]
    public void Wenn_Ausgabegrenze_klein_und_Diff_darueber_dann_zu_gross_ohne_Patch_und_die_Meldung_nennt_die_Grenze()
    {
        using var repo = DiffRepo.Gross();
        var gr = GrosseDiffsSprache.Aufruf(repo, ["w"], Klein());

        var riesig = gr.NurAenderungen("w", "riesig.txt");

        Assert.That(riesig.Ausgang, Is.EqualTo("zu groß"));
        Assert.That(riesig.Pfad, Is.Null);
        Assert.That(riesig.Zeilen, Is.Empty, "kein gekürzter Rumpf");
        Assert.That(riesig.Meldung, Does.Contain("zu groß").And.Contain("1024"), "die Meldung nennt die Grenze");
    }

    [Test]
    public void Wenn_Ausgabegrenze_gross_dann_liefert_der_Interactor_den_vollstaendigen_Patch()
    {
        using var repo = DiffRepo.Gross();
        var gr = GrosseDiffsSprache.Aufruf(repo, ["w"], Ausgabegrenze.Standard);

        var winzig = gr.NurAenderungen("w", "winzig.txt");
        var riesig = gr.NurAenderungen("w", "riesig.txt");

        Assert.That(winzig.Ausgang, Is.EqualTo("gelesen"));
        Assert.That(winzig.Zeilen, Is.EqualTo(new[] { "+eins", "+zwei", "+drei" }));
        Assert.That(riesig.Ausgang, Is.EqualTo("gelesen"), "ganz oder gar nicht");
        Assert.That(riesig.TexteMitNummerNeu(), Has.Length.EqualTo(30000));
        Assert.That(riesig.TexteMitNummerNeu()[^1], Is.EqualTo("zeile 30000"));
    }

    [Test]
    public void Wenn_kleine_Ausgabegrenze_dann_greift_sie_in_nur_Aenderungen_ganzer_Datei_und_als_Text_gleich()
    {
        using var repo = DiffRepo.Gross();
        var gr = GrosseDiffsSprache.Aufruf(repo, ["w"], Klein());

        Assert.That(gr.NurAenderungen("w", "riesig.txt").Ausgang, Is.EqualTo("zu groß"));
        Assert.That(gr.GanzeDatei("w", "riesig.txt").Ausgang, Is.EqualTo("zu groß"));
        Assert.That(gr.AlsText("w", "logo.bin").Ausgang, Is.EqualTo("zu groß"), "Binärdatei mit --text");
    }

    [Test]
    public void Wenn_Objekt_fehlt_dann_nicht_lesbar_und_von_zu_gross_unterscheidbar()
    {
        using var repo = DiffRepo.Gross();
        var gr = GrosseDiffsSprache.Aufruf(repo, ["w"], Klein());

        var zuGross = gr.NurAenderungen("w", "riesig.txt");
        gr.ObjektdateiEntfernen("w");
        var nichtLesbar = gr.NurAenderungen("w", "riesig.txt");

        Assert.That(zuGross.Ausgang, Is.EqualTo("zu groß"));
        Assert.That(nichtLesbar.Ausgang, Is.EqualTo("nicht lesbar"));
    }

    [Test]
    public void Wenn_kleine_Ausgabegrenze_dann_ist_der_Ausgang_kein_Fehler_sondern_eine_Warnung()
    {
        using var repo = DiffRepo.Gross();
        var gr = GrosseDiffsSprache.Aufruf(repo, ["w"], Klein());

        gr.NurAenderungen("w", "riesig.txt");

        var warnungen = gr.Warnungen();
        Assert.That(warnungen, Has.Length.EqualTo(1));
        Assert.That(warnungen[0], Does.Contain(gr.HashVon("w")).And.Contain("riesig.txt").And.Contain("1024"));
    }
}
