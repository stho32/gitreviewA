using System.Runtime.Versioning;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Spezifikation R00012/R00014 „Sperre und Stapel vergleichen denselben Namen“ (Nacharbeit Karte 27, Befund M2 / Lehre #29): zwei
/// Dateien, deren Anzeigenamen gleich sind — die eine wörtlich `a⟨U+202E⟩.txt`, die andere mit dem echten Zeichen U+202E —, sind
/// zwei Dateien. Der Diff weist den Anzeigenamen als nicht eindeutig ab; der Stapel-Haken muss dieselbe Antwort geben und darf nie
/// beide Dateien als „gesehen“ erklären. Die Anzeige im Browser prüft <c>e2e/tests/zusammen-namenskollision.spec.js</c>.
/// </summary>
[Platform(Exclude = "Win", Reason = "Namen mit U+202E legt nur bash unter Linux")]
[UnsupportedOSPlatform("windows")]
public class StapelNamenskollisionTests
{
    private const string Anzeigename = "a⟨U+202E⟩.txt";
    private const string NichtEindeutig = "Diff nicht lesbar: Name nicht eindeutig";

    private const string Skript = """
        set -e
        printf 'literal\n' > 'a⟨U+202E⟩.txt'
        printf 'echt\n' > $'a\u202e.txt'
        git add -A && git commit -q -m "Zwei Namen, ein Anzeigename"
        """;

    [Test]
    [Description("Befund M2: Stapel und Diff vergleichen denselben Anzeigenamen")]
    public void Wenn_zwei_Dateien_denselben_Anzeigenamen_tragen_dann_lehnt_der_Stapel_ab_und_setzt_keine_Stelle()
    {
        using var repo = FremdeNamenRepo.AusSkript(Skript, "c1");
        var sprache = ZusammenSprache.Aufruf(repo.Ordner, repo.Hash, "c1");

        var dateien = sprache.Dateien();
        var stapel = sprache.HakeDatei(Anzeigename, true);
        var nachStapel = sprache.Fortschritt();
        var entnehmen = sprache.HakeDatei(Anzeigename, false);

        Assert.That(dateien.Select(datei => datei.Split('|')[0]), Is.EqualTo(new[] { Anzeigename, Anzeigename }), "Kontrolle: zwei Einträge tragen denselben Anzeigenamen");
        Assert.That((stapel.Ausgang, stapel.Grund), Is.EqualTo(("ungültig", NichtEindeutig)));
        Assert.That(stapel.Gesetzt, Is.Zero, "keine der beiden Dateien wird gesetzt");
        Assert.That(nachStapel, Is.EqualTo("0 von 2 abgehakt"));
        Assert.That((entnehmen.Ausgang, entnehmen.Grund), Is.EqualTo(("ungültig", NichtEindeutig)), "auch das Entnehmen wird ganz abgelehnt");
        Assert.That(sprache.Fortschritt(), Is.EqualTo("0 von 2 abgehakt"));
    }

    [Test]
    [Description("Befund M2: die Sperre des Diffs sagt dasselbe wie der Stapel")]
    public void Wenn_der_Anzeigename_mehrdeutig_ist_dann_endet_auch_der_Diff_am_Namen()
    {
        using var repo = FremdeNamenRepo.AusSkript(Skript, "c1");
        var sprache = ZusammenSprache.Aufruf(repo.Ordner, repo.Hash, "c1");

        var diff = sprache.Diff(Anzeigename);

        Assert.That(diff.Ausgang, Is.EqualTo("name nicht lesbar"), "dieselbe Antwort, die der Stapel als Sperrgrund nennt");
        Assert.That(diff.Zeilen, Is.Empty);
    }
}