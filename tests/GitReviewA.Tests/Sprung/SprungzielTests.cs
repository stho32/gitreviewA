using GitReviewA.Sprung;

namespace GitReviewA.Tests.Sprung;

/// <summary>
/// B2002: `Sprungziel` kodiert den absoluten Pfad je Teil wie `encodeURIComponent` und stellt das feste Schema `vscode://file` voran.
/// Ebene: Unit — die Vorlage kanbanD `teileKodiert` als Vertrag.
/// </summary>
public class SprungzielTests
{
    [TestCase("/repo-wurzel/src/a.txt", "vscode://file/repo-wurzel/src/a.txt")]
    [TestCase("/repo/Ordner mit Leerzeichen/datei#1.txt", "vscode://file/repo/Ordner%20mit%20Leerzeichen/datei%231.txt")]
    [TestCase("/repo/prozent%25.txt", "vscode://file/repo/prozent%2525.txt")]
    [TestCase("/repo/ä.txt", "vscode://file/repo/%C3%A4.txt")]
    [TestCase("/repo/a!b~c*d'e(f)g.txt", "vscode://file/repo/a!b~c*d'e(f)g.txt")]
    [TestCase("/repo/plus+und&mehr=so;txt", "vscode://file/repo/plus%2Bund%26mehr%3Dso%3Btxt")]
    public void Wenn_ein_absoluter_Pfad_dann_Schema_und_prozent_kodierte_Teile(string pfad, string erwartet)
    {
        var ziel = Sprungziel.Fuer(pfad);

        Assert.That(ziel, Is.EqualTo(erwartet));
    }

    [Test]
    public void Wenn_ein_Pfad_dann_immer_das_feste_Schema_und_niemals_ein_anderes()
    {
        var ziel = Sprungziel.Fuer("/repo/a.txt");

        Assert.That(ziel, Does.StartWith("vscode://file/"));
        Assert.That(ziel, Does.Not.Contain("javascript:"));
    }

    [Test]
    public void Wenn_die_Wurzel_ein_Leerzeichen_traegt_dann_auch_ihr_Teil_kodiert()
    {
        var ziel = Sprungziel.Fuer("/home/mit Leerzeichen/repo/a.txt");

        Assert.That(ziel, Is.EqualTo("vscode://file/home/mit%20Leerzeichen/repo/a.txt"));
    }

    [TestCase("/repo/\U0001F600.txt", "vscode://file/repo/%F0%9F%98%80.txt")]
    [TestCase("/repo/\U0001F600/datei.txt", "vscode://file/repo/%F0%9F%98%80/datei.txt")]
    [TestCase("/wurzel\U0001F600/datei.txt", "vscode://file/wurzel%F0%9F%98%80/datei.txt")]
    public void Wenn_ein_Name_ein_astrales_Zeichen_traegt_dann_als_ein_Codepunkt_kodiert(string pfad, string erwartet)
    {
        var ziel = Sprungziel.Fuer(pfad);

        Assert.That(ziel, Is.EqualTo(erwartet));
    }

    [Test]
    public void Wenn_zwei_Namen_verschieden_aussehen_dann_verschiedene_Ziele()
    {
        var astral = Sprungziel.Fuer("/repo/\U0001F600.txt");
        var ersatzzeichen = Sprungziel.Fuer("/repo/\uFFFD\uFFFD.txt");

        Assert.That(astral, Is.EqualTo("vscode://file/repo/%F0%9F%98%80.txt"));
        Assert.That(ersatzzeichen, Is.EqualTo("vscode://file/repo/%EF%BF%BD%EF%BF%BD.txt"));
    }
}
