using GitReviewA.Git;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Git;

public class GitLogAusgabeTests
{
    private const string HashC = "c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6";
    private const string HashA = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";

    [Test]
    public void Wenn_zwei_Datensaetze_dann_zwei_Commitzeilen_in_gleicher_Reihenfolge_mit_Kurzhash_aus_7_Zeichen()
    {
        var ausgabe = Datensatz(HashC, "Bernd Beispiel", "2026-03-05T18:30:00+01:00", "Dritter Commit", "Zeile eins\nZeile zwei\n")
            + "\0" + Datensatz(HashA, "Anna Beispiel", "2026-03-04T09:15:00+01:00", "Erster Commit", "");

        var zeilen = GitLogAusgabe.Zerlegen(ausgabe).AlsArray();

        Assert.That(zeilen, Is.EqualTo(new[]
        {
            new Commitzeile(HashC, "Bernd Beispiel", "2026-03-05T18:30:00+01:00", "Dritter Commit", "Zeile eins\nZeile zwei"),
            new Commitzeile(HashA, "Anna Beispiel", "2026-03-04T09:15:00+01:00", "Erster Commit", ""),
        }));
        Assert.That(zeilen[0].KurzHash, Is.EqualTo("c3d4e5f"));
        Assert.That(zeilen[1].KurzHash, Is.EqualTo("a1b2c3d"));
    }

    [Test]
    public void Wenn_Rumpf_Leerzeilen_enthaelt_dann_bleiben_sie_und_nur_der_Zeilenumbruch_am_Ende_faellt_weg()
    {
        var ausgabe = Datensatz(HashA, "A", "2026-03-04T09:15:00+01:00", "Betreff", "Absatz eins\n\nAbsatz zwei\n\n") + "\0";

        var zeile = GitLogAusgabe.Zerlegen(ausgabe).AlsArray().Single();

        Assert.That(zeile.Rumpf, Is.EqualTo("Absatz eins\n\nAbsatz zwei"));
    }

    [Test]
    public void Wenn_Texte_Sonderzeichen_oder_leer_dann_unveraendert()
    {
        var ausgabe = Datensatz(HashC, "<i>Mallory</i>", "2026-03-04T09:15:00+01:00", "<script>alert(1)</script> & „Ä“", "<b>fett</b>")
            + "\0" + Datensatz(HashA, "", "2026-03-04T09:15:00+01:00", "", "");

        var zeilen = GitLogAusgabe.Zerlegen(ausgabe).AlsArray();

        Assert.That(zeilen.Select(zeile => (zeile.Autor, zeile.Betreff, zeile.Rumpf)), Is.EqualTo(new[]
        {
            ("<i>Mallory</i>", "<script>alert(1)</script> & „Ä“", "<b>fett</b>"),
            ("", "", ""),
        }));
    }

    [Test]
    public void Wenn_Ausgabe_leer_dann_keine_Commitzeilen()
    {
        var zeilen = GitLogAusgabe.Zerlegen(string.Empty);

        Assert.That(zeilen.Anzahl, Is.Zero);
    }

    [Test]
    public void Wenn_Datensatz_zu_wenige_Felder_hat_dann_GitFehler()
    {
        var ausgabe = $"{HashA}\u001fnur Autor";

        Assert.Throws<GitFehler>(() => GitLogAusgabe.Zerlegen(ausgabe));
    }

    private static string Datensatz(string hash, string autor, string datum, string betreff, string rumpf)
    {
        return string.Join('\u001f', hash, autor, datum, betreff, rumpf);
    }
}
