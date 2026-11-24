using GitReviewA.Aufruf;
using GitReviewA.Git;

namespace GitReviewA.Tests.Aufruf;

public class HashpraefixPrueferTests
{
    private const string C1 = "abcd111111111111111111111111111111111111";
    private const string C4 = "4444444444444444444444444444444444444444";

    [Test]
    public void Wenn_jeder_gelesene_Hash_mit_seiner_Eingabe_beginnt_dann_kein_Fehler()
    {
        var eingaben = new CommitHashes(["abcd", C4]);
        var gelesen = new Commitzeilen([new Commitzeile(C1, "Testperson", "2026-01-01T09:00:00+00:00", "c1", ""), new Commitzeile(C4, "Testperson", "2026-01-01T09:00:00+00:00", "c4", "")]);

        Assert.DoesNotThrow(() => HashpraefixPruefer.PruefeTreffer(eingaben, gelesen));
    }

    [Test]
    public void Wenn_git_fuer_das_Praefix_einen_anderen_Commit_liefert_dann_mehrdeutig_ohne_Eingabetext()
    {
        var eingaben = new CommitHashes(["abcd"]);
        var gelesen = new Commitzeilen([new Commitzeile(C4, "Testperson", "2026-01-01T09:00:00+00:00", "c4", "")]);

        var fehler = Assert.Throws<AuswahlFehler>(() => HashpraefixPruefer.PruefeTreffer(eingaben, gelesen));

        Assert.That(fehler.Message, Does.Contain("mehrdeutig"));
        Assert.That(fehler.Message, Does.Not.Contain("abcd"));
    }

    [Test]
    public void Wenn_umgelenktes_Praefix_neben_dem_richtigen_vollen_Hash_steht_dann_ebenfalls_mehrdeutig()
    {
        var eingaben = new CommitHashes(["abcd", C1]);
        var gelesen = new Commitzeilen([new Commitzeile(C4, "Testperson", "2026-01-01T09:00:00+00:00", "c4", ""), new Commitzeile(C1, "Testperson", "2026-01-01T09:00:00+00:00", "c1", "")]);

        Assert.Throws<AuswahlFehler>(() => HashpraefixPruefer.PruefeTreffer(eingaben, gelesen));
    }

    [Test]
    public void Wenn_Eingabe_in_Grossbuchstaben_dann_Vergleich_ohne_Gross_und_Kleinschreibung()
    {
        var eingaben = new CommitHashes(["ABCD"]);
        var gelesen = new Commitzeilen([new Commitzeile(C1, "Testperson", "2026-01-01T09:00:00+00:00", "c1", "")]);

        Assert.DoesNotThrow(() => HashpraefixPruefer.PruefeTreffer(eingaben, gelesen));
    }

    [Test]
    public void Wenn_Grossbuchstaben_auf_einen_anderen_Commit_zeigen_dann_mehrdeutig()
    {
        var eingaben = new CommitHashes(["ABCD"]);
        var gelesen = new Commitzeilen([new Commitzeile(C4, "Testperson", "2026-01-01T09:00:00+00:00", "c4", "")]);

        Assert.Throws<AuswahlFehler>(() => HashpraefixPruefer.PruefeTreffer(eingaben, gelesen));
    }
}
