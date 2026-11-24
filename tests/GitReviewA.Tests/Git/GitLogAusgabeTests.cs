using GitReviewA.Git;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Git;

public class GitLogAusgabeTests
{
    private const string HashC = "c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6";
    private const string HashA = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";

    [Test]
    public void Wenn_zwei_Zeilen_dann_zwei_Commitzeilen_in_gleicher_Reihenfolge_mit_Kurzhash_aus_7_Zeichen()
    {
        var ausgabe = $"{HashC}\u001fDritter Commit\n{HashA}\u001fErster Commit\n";

        var zeilen = GitLogAusgabe.Zerlegen(ausgabe).AlsArray();

        Assert.That(zeilen, Is.EqualTo(new[]
        {
            new Commitzeile(HashC, "Dritter Commit"),
            new Commitzeile(HashA, "Erster Commit"),
        }));
        Assert.That(zeilen[0].KurzHash, Is.EqualTo("c3d4e5f"));
        Assert.That(zeilen[1].KurzHash, Is.EqualTo("a1b2c3d"));
    }

    [Test]
    public void Wenn_Betreff_Sonderzeichen_oder_leer_dann_unveraendert()
    {
        var ausgabe = $"{HashC}\u001f<script>alert(1)</script> & „Ä“\n{HashA}\u001f\n";

        var zeilen = GitLogAusgabe.Zerlegen(ausgabe).AlsArray();

        Assert.That(zeilen.Select(zeile => zeile.Betreff), Is.EqualTo(new[] { "<script>alert(1)</script> & „Ä“", "" }));
    }

    [Test]
    public void Wenn_Ausgabe_leer_dann_keine_Commitzeilen()
    {
        var zeilen = GitLogAusgabe.Zerlegen(string.Empty);

        Assert.That(zeilen.Anzahl, Is.Zero);
    }
}
