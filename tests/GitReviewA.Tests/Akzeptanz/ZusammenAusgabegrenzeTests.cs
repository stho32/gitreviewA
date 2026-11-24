using System.Runtime.Versioning;
using GitReviewA.Git;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Nacharbeit I0010, Befund M1 (#10, Code-Review) und S1: der Netto-Diff liest mit derselben Ausgabegrenze wie der Einzel-Diff.
/// Über der Grenze endet er als „zu groß“ mit der Grenze und ohne Patch, darunter liefert er den vollständigen Patch (Kontrolle);
/// ohne Kette endet ein zu großer Abschnitt im selben Ausgang statt in einem unbehandelten Fehler. Ebene: Integration gegen den
/// <see cref="GitReviewA.Zusammen.ZusammenLesenInteractor"/> mit echtem `git` im Wegwerf-Repo.
/// </summary>
[Platform(Exclude = "Win", Reason = "Wegwerf-Repos und git-Aufrufe")]
[UnsupportedOSPlatform("windows")]
public class ZusammenAusgabegrenzeTests
{
    private static Ausgabegrenze Klein()
    {
        return new Ausgabegrenze(1024);
    }

    [Test]
    [Description("M1 Abnahme-Probe: lückenlose Kette, Datei über der Grenze → zu groß mit Grenze und ohne Patch; darunter vollständig")]
    public void Wenn_lueckenlos_und_der_Netto_Diff_ueber_der_Ausgabegrenze_liegt_dann_zu_gross_ohne_Patch()
    {
        using var z = ZusammenRepo.Grenze();
        var sprache = ZusammenSprache.AufrufMitAusgabegrenze(z.Ordner, z.Hash, Klein(), "z1", "z2", "z3");

        var zuGross = sprache.Diff("riesig.txt");
        var kontrolle = sprache.Diff("winzig.txt");

        Assert.That(sprache.Lueckenlos(), Is.True);
        Assert.That(zuGross.Ausgang, Is.EqualTo("zu groß"));
        Assert.That(zuGross.Zeilen, Is.Empty, "kein gekürzter Rumpf, ganz oder gar nicht");
        Assert.That(zuGross.Meldung, Does.Contain("zu groß").And.Contain("1024"), "die Meldung nennt die Grenze");
        Assert.That(kontrolle.Ausgang, Is.EqualTo("gelesen"), "unter der Grenze die Kontrolle");
        Assert.That(kontrolle.Zeilen, Is.EqualTo(new[] { "+eins", "+ZWEI", "+drei", "+vier" }));
    }

    [Test]
    [Description("S1: ohne Kette endet eine zu große Stelle als zu groß, nicht als nicht lesbar (keine unbehandelte 500)")]
    public void Wenn_ohne_Kette_ein_Abschnitt_ueber_der_Ausgabegrenze_liegt_dann_zu_gross_und_nicht_nicht_lesbar()
    {
        using var z = ZusammenRepo.Grenze();
        var sprache = ZusammenSprache.AufrufMitAusgabegrenze(z.Ordner, z.Hash, Klein(), "z1", "z3");

        var zuGross = sprache.Diff("riesig.txt");

        Assert.That(sprache.Lueckenlos(), Is.False);
        Assert.That(zuGross.Ausgang, Is.EqualTo("zu groß"));
        Assert.That(zuGross.Abschnitte, Is.Empty);
        Assert.That(zuGross.Meldung, Does.Contain("1024"));
    }
}