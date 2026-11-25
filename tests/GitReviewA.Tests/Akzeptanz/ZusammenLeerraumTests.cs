using System.Runtime.Versioning;
using GitReviewA.Diff;
using GitReviewA.Git;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Nacharbeit I0027 (R00012): der Umschalter „Leerraum“ wirkt auch in „Zusammen“. Der Netto-Diff der lückenlosen Kette und die
/// Abschnitte ohne Kette vergleichen mit `-w` (`--ignore-all-space`, wie R00026 B2501): die reine Leerraum-Änderung zeigt keine
/// Zeilen (derselbe Wortlaut „Keine Zeilenänderungen“ wie im Einzel-Modus), die echte Änderung bleibt. Ebene: Integration gegen
/// den <see cref="GitReviewA.Zusammen.ZusammenLesenInteractor"/> mit echtem `git` im Wegwerf-Repo.
/// </summary>
[Platform(Exclude = "Win", Reason = "Wegwerf-Repos und git-Aufrufe")]
[UnsupportedOSPlatform("windows")]
public class ZusammenLeerraumTests
{
    [Test]
    [Description("Abnahme-Probe: lückenlos, „ignorieren“ → reine Leerraum-Änderung ohne Zeilen, echte Änderung bleibt")]
    public void Wenn_Zusammen_lueckenlos_und_Leerraum_ignoriert_dann_Leerraum_Datei_ohne_Zeilen_und_echte_bleibt()
    {
        using var z = ZusammenRepo.Leerraum();
        var sprache = ZusammenSprache.Aufruf(z.Ordner, z.Hash, "z2");

        var still = sprache.Diff("still.txt", Diffumfang.Aenderungen, Leerraum.Ignorieren);
        var echt = sprache.Diff("echt.txt", Diffumfang.Aenderungen, Leerraum.Ignorieren);

        Assert.That(sprache.Lueckenlos(), Is.True);
        Assert.That(still.Ausgang, Is.EqualTo("gelesen"), "die leere Antwort bleibt gelesen, wie im Einzel-Modus");
        Assert.That(still.Zeilen, Is.Empty, "die reine Leerraum-Änderung verschwindet aus dem Netto-Diff");
        Assert.That((echt.Ausgang, echt.Zeilen), Is.EqualTo(("gelesen", new[] { "-y", "+Y" })), "die echte Änderung bleibt");
    }

    [Test]
    [Description("Abnahme-Probe: lückenlos, „beachten“ → beide Dateien zeigen ihre Zeilen")]
    public void Wenn_Zusammen_lueckenlos_und_Leerraum_beachtet_dann_zeigen_beide_Dateien_ihre_Zeilen()
    {
        using var z = ZusammenRepo.Leerraum();
        var sprache = ZusammenSprache.Aufruf(z.Ordner, z.Hash, "z2");

        var still = sprache.Diff("still.txt");
        var echt = sprache.Diff("echt.txt");

        Assert.That(still.Zeilen, Is.EqualTo(new[] { "-b", "+  b" }), "ohne -w steht die Einrückung als Änderung da");
        Assert.That(echt.Zeilen, Is.EqualTo(new[] { "-y", "+Y" }));
    }

    [Test]
    [Description("Abnahme-Probe: ohne Kette, „ignorieren“ → der Abschnitt der Leerraum-Datei ohne Zeilen, die echte bleibt")]
    public void Wenn_Zusammen_ohne_Kette_und_Leerraum_ignoriert_dann_Abschnitt_der_Leerraum_Datei_ohne_Zeilen()
    {
        using var z = ZusammenRepo.Leerraum();
        var sprache = ZusammenSprache.Aufruf(z.Ordner, z.Hash, "z2", "z4");

        var still = sprache.Diff("still.txt", Diffumfang.Aenderungen, Leerraum.Ignorieren);
        var echt = sprache.Diff("echt.txt", Diffumfang.Aenderungen, Leerraum.Ignorieren);

        Assert.That(sprache.Lueckenlos(), Is.False);
        var abschnitt = still.Abschnitte.Single();
        Assert.That((abschnitt.Commit, abschnitt.Zeilen), Is.EqualTo(("z2", Array.Empty<string>())), "`git show` mit -w liefert für die reine Leerraum-Änderung nichts");
        Assert.That(echt.Abschnitte.Single().Zeilen, Is.EqualTo(new[] { "-y", "+Y" }), "die echte Änderung bleibt");
    }

    [Test]
    [Description("Abnahme-Probe: ohne Kette, „beachten“ → der Abschnitt der Leerraum-Datei zeigt seine Zeilen")]
    public void Wenn_Zusammen_ohne_Kette_und_Leerraum_beachtet_dann_zeigt_der_Abschnitt_seine_Zeilen()
    {
        using var z = ZusammenRepo.Leerraum();
        var sprache = ZusammenSprache.Aufruf(z.Ordner, z.Hash, "z2", "z4");

        var still = sprache.Diff("still.txt");

        Assert.That(sprache.Lueckenlos(), Is.False);
        Assert.That(still.Abschnitte.Single().Zeilen, Is.EqualTo(new[] { "-b", "+  b" }));
    }
}
