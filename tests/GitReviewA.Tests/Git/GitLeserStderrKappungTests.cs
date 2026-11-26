using GitReviewA.Git;

namespace GitReviewA.Tests.Git;

/// <summary>
/// H2: die stderr-Kappung auf 64 KiB (L5) am Baustein selbst — ein fremdes Repo kann beliebig viel auf stderr schreiben, die
/// Meldung bleibt begrenzt und behält ihren Anfang. Ebene: Unit gegen den Fehlertext-Baustein des Lesewegs, ohne git-Prozess.
/// </summary>
public class GitLeserStderrKappungTests
{
    private const int Hoechstlaenge = 64 * 1024;

    [Test]
    [Description("H2: viele Zeilen — der Text bleibt bei 64 KiB, der Anfang steht, das Ende fehlt")]
    public void Wenn_viele_Zeilen_ankommen_dann_bleibt_der_Text_bei_64_KiB()
    {
        var fehler = new GitLeser.Fehlertext();
        for (var nummer = 0; nummer < 200; nummer++)
        {
            fehler.HaengeAn($"{nummer:D3} {new string('x', 1020)}");
        }

        var text = fehler.Text;

        Assert.That(text.Length, Is.LessThanOrEqualTo(Hoechstlaenge));
        Assert.That(text, Does.StartWith("000 "), "der Anfang bleibt");
        Assert.That(text, Does.Not.Contain("199 "), "die letzten Zeilen fallen weg");
    }

    [Test]
    [Description("H2: eine einzelne Zeile über der Grenze — gekappt, ohne Zeilenumbruch am Ende")]
    public void Wenn_eine_Zeile_ueber_der_Grenze_ankommt_dann_gekappt()
    {
        var fehler = new GitLeser.Fehlertext();

        fehler.HaengeAn(new string('x', 200 * 1024));

        var text = fehler.Text;

        Assert.That(text.Length, Is.EqualTo(Hoechstlaenge - 1));
        Assert.That(text, Does.Not.Contain("\n"), "die Zeile bleibt eine Zeile");
    }

    [Test]
    [Description("H2 Kontrolle: wenige Zeilen kommen ganz an — die Kappung schneidet nichts ab, was passt")]
    public void Wenn_wenige_Zeilen_ankommen_dann_ganz()
    {
        var fehler = new GitLeser.Fehlertext();

        fehler.HaengeAn("erste");
        fehler.HaengeAn("zweite");
        fehler.HaengeAn(null);

        Assert.That(fehler.Text, Is.EqualTo("erste\nzweite"));
    }
}
