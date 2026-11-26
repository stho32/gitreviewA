using GitReviewA.Dateiansicht;
using GitReviewA.Git;

namespace GitReviewA.Tests.Dateiansicht;

/// <summary>
/// R00046 Kriterien 2, 5, 8 und 9 gegen Repo C: Commit auflösen (nur Commit-Objekte, Tag-Umlenkung), Eintrag lesen (Datei,
/// ausführbar, Verzeichnis, Link, Submodul, fehlt; Pfad wörtlich, keine Pathspec-Magie), Start aus dem Unterordner.
/// Ebene: Integration gegen den Interactor, git gegen ein Wegwerf-Repo.
/// </summary>
[NonParallelizable]
public class GitCommitDateiquelleTests
{
    [Test]
    public void Wenn_der_Praefix_eindeutig_ist_dann_der_volle_Hash()
    {
        using var c = RepoC.Anlegen();
        var quelle = Quelle(c);

        var aufloesung = quelle.Aufloese(c.C1[..8]);

        Assert.That(aufloesung.IstAufgeloest, Is.True);
        Assert.That(aufloesung.VollerHash, Is.EqualTo(c.C1));
    }

    [Test]
    public void Wenn_der_Hash_Gross_geschrieben_ist_dann_gleich_aufgeloest()
    {
        using var c = RepoC.Anlegen();
        var quelle = Quelle(c);

        var aufloesung = quelle.Aufloese(c.C1[..8].ToUpperInvariant());

        Assert.That(aufloesung.VollerHash, Is.EqualTo(c.C1));
    }

    [Test]
    public void Wenn_kein_Objekt_den_Hash_traegt_dann_Commit_nicht_gefunden()
    {
        using var c = RepoC.Anlegen();

        var aufloesung = Quelle(c).Aufloese("deadbeef00");

        Assert.That(aufloesung.IstAufgeloest, Is.False);
        Assert.That(aufloesung.Grund?.Art, Is.EqualTo(Quellengrundart.CommitNichtGefunden));
    }

    [Test]
    public void Wenn_ein_Tag_wie_der_Praefix_heisst_dann_mehrdeutig_und_nie_der_Inhalt_des_Ziels()
    {
        using var c = RepoC.Anlegen();
        var praefix = c.C2[..7];
        Assert.That(c.C1.StartsWith(praefix, StringComparison.OrdinalIgnoreCase), Is.False, "der Testpräfix muss sich von c1 unterscheiden");
        c.Git("tag", praefix, c.C1);

        var aufloesung = Quelle(c).Aufloese(praefix);

        Assert.That(aufloesung.IstAufgeloest, Is.False);
        Assert.That(aufloesung.Grund?.Art, Is.EqualTo(Quellengrundart.CommitMehrdeutig));
    }

    [Test]
    public void Wenn_der_Hash_eines_Trees_ist_dann_kein_Commit()
    {
        using var c = RepoC.Anlegen();
        var tree = c.Git("rev-parse", $"{c.C1}^{{tree}}");

        Assert.That(Quelle(c).Aufloese(tree).Grund?.Art, Is.EqualTo(Quellengrundart.KeinCommit));
    }

    [Test]
    public void Wenn_der_Hash_eines_Blobs_ist_dann_kein_Commit()
    {
        using var c = RepoC.Anlegen();
        var blob = c.Git("rev-parse", $"{c.C1}:sql/a.sql");

        Assert.That(Quelle(c).Aufloese(blob).Grund?.Art, Is.EqualTo(Quellengrundart.KeinCommit));
    }

    [Test]
    public void Wenn_der_Hash_eines_annotierten_Tagobjekts_ist_dann_kein_Commit()
    {
        using var c = RepoC.Anlegen();
        c.Git("tag", "-a", "-f", "ann", c.C1, "-m", "x");
        var tagobjekt = c.Git("rev-parse", "ann");

        Assert.That(Quelle(c).Aufloese(tagobjekt).Grund?.Art, Is.EqualTo(Quellengrundart.KeinCommit));
    }

    [Test]
    public void Wenn_der_Hash_der_leere_Baum_ist_dann_kein_Commit()
    {
        using var c = RepoC.Anlegen();

        Assert.That(Quelle(c).Aufloese(RepoC.Leerbaum).Grund?.Art, Is.EqualTo(Quellengrundart.KeinCommit));
    }

    [Test]
    public void Wenn_ohne_Repository_dann_Kein_Git_Repository_mit_dem_Wortlaut_aus_R00016()
    {
        using var d = OrdnerD.Anlegen();

        var aufloesung = new GitCommitDateiquelle(d.Ordner, new Quellenbuchung()).Aufloese("abcdef01");

        Assert.That(aufloesung.Grund?.Art, Is.EqualTo(Quellengrundart.KeinRepository));
        Assert.That(QuellengrundMeldungen.Meldung(aufloesung.Grund!), Does.StartWith("Kein Git-Repository"));
    }

    [TestCase("sql/a.sql", (int)Baumart.Datei, 10)]
    [TestCase("bin/run.sh", (int)Baumart.AusfuehrbareDatei, 21)]
    [TestCase("x\u202e.sql", (int)Baumart.Datei, 10)]
    [TestCase("cafe:x.sql", (int)Baumart.Datei, 15)]
    public void Wenn_der_Pfad_eine_Datei_ist_dann_wird_sie_gelesen(string pfad, int art, long groesse)
    {
        using var c = RepoC.Anlegen();

        var ergebnis = Quelle(c).Eintrag(c.C1, pfad, Ausgabegrenze.Standard);

        Assert.That(ergebnis.IstGefunden, Is.True);
        Assert.That((int)ergebnis.Eintrag!.Art, Is.EqualTo(art));
        Assert.That(ergebnis.Eintrag.Groesse, Is.EqualTo(groesse));
        Assert.That(ergebnis.Eintrag.Pfad, Is.EqualTo(pfad));
    }

    [TestCase("sql/alt", (int)Quellengrundart.IstImCommitEinVerzeichnis)]
    [TestCase("sql/alt/", (int)Quellengrundart.IstImCommitEinVerzeichnis)]
    [TestCase("sql", (int)Quellengrundart.IstImCommitEinVerzeichnis)]
    [TestCase("link.sql", (int)Quellengrundart.IstImCommitEinSymbolischerLink)]
    [TestCase("sub", (int)Quellengrundart.IstImCommitEinSubmodul)]
    [TestCase("sql/fehlt.sql", (int)Quellengrundart.PfadImCommitNichtGefunden)]
    [TestCase("sql/a.sql/", (int)Quellengrundart.PfadImCommitNichtGefunden)] // Schrägstrich auf eine Datei
    [TestCase("sql/./a.sql", (int)Quellengrundart.PfadImCommitNichtGefunden)] // wörtlich: git würde normalisieren
    [TestCase("sql//a.sql", (int)Quellengrundart.PfadImCommitNichtGefunden)]
    [TestCase("sql/../sql/a.sql", (int)Quellengrundart.PfadImCommitNichtGefunden)]
    [TestCase("SQL/A.SQL", (int)Quellengrundart.PfadImCommitNichtGefunden)]
    [TestCase(":(top)sql/a.sql", (int)Quellengrundart.PfadImCommitNichtGefunden)] // keine Pathspec-Magie
    [TestCase(":/sql/a.sql", (int)Quellengrundart.PfadImCommitNichtGefunden)]
    [TestCase("*.sql", (int)Quellengrundart.PfadImCommitNichtGefunden)]
    [TestCase("/sql/a.sql", (int)Quellengrundart.PfadImCommitNichtGefunden)]
    [TestCase("sql/", (int)Quellengrundart.IstImCommitEinVerzeichnis)]
    public void Wenn_der_Pfad_keine_lesbare_Datei_ist_dann_genau_dieser_Grund(string pfad, int erwartet)
    {
        using var c = RepoC.Anlegen();

        var ergebnis = Quelle(c).Eintrag(c.C1, pfad, Ausgabegrenze.Standard);

        Assert.That(ergebnis.IstGefunden, Is.False);
        Assert.That((int)(ergebnis.Grund?.Art ?? 0), Is.EqualTo(erwartet));
    }

    [Test]
    public void Wenn_der_Start_im_Unterordner_ist_dann_wurzelrelativ_und_Punktschraegstrich_startrelativ()
    {
        using var c = RepoC.Anlegen();
        var imSql = new GitCommitDateiquelle(c.Pfad("sql"), new Quellenbuchung());

        var wurzelrelativ = imSql.Eintrag(c.C1, "sql/a.sql", Ausgabegrenze.Standard);
        var startrelativ = imSql.Eintrag(c.C1, "./a.sql", Ausgabegrenze.Standard);
        var nurName = imSql.Eintrag(c.C1, "a.sql", Ausgabegrenze.Standard);

        Assert.That(wurzelrelativ.IstGefunden, Is.True);
        Assert.That(wurzelrelativ.Eintrag!.Pfad, Is.EqualTo("sql/a.sql"));
        Assert.That(startrelativ.IstGefunden, Is.True);
        Assert.That(startrelativ.Eintrag!.Pfad, Is.EqualTo("sql/a.sql"));
        Assert.That(nurName.Grund?.Art, Is.EqualTo(Quellengrundart.PfadImCommitNichtGefunden));
    }

    [Test]
    public void Wenn_der_Blob_gelesen_wird_dann_genau_die_Bytes_des_Commits()
    {
        using var c = RepoC.Anlegen();

        var blob = Quelle(c).Blob(c.C1, "sql/a.sql", Ausgabegrenze.Standard);

        Assert.That(blob.IstGelesen, Is.True);
        Assert.That(System.Text.Encoding.UTF8.GetString(blob.Bytes!), Is.EqualTo("SELECT 1;\n"));
    }

    [Test]
    public void Wenn_die_Grenze_kleiner_ist_als_der_Blob_dann_zu_gross_ganz_oder_gar_nicht()
    {
        using var c = RepoC.Anlegen();

        var blob = Quelle(c).Blob(c.C1, "sql/a.sql", new Ausgabegrenze(4));

        Assert.That(blob.IstGelesen, Is.False);
        Assert.That(blob.Grund?.Art, Is.EqualTo(Quellengrundart.ZuGross));
    }

    [Test]
    public void Wenn_die_Grenze_kleiner_ist_als_der_Eintrag_dann_zu_gross_schon_am_Eintrag_Aufruf()
    {
        using var c = RepoC.Anlegen();

        var fehler = Assert.Throws<GitZuGross>(() => GitLeser.EintragLesen(c.C1, "sql/a.sql", c.Ordner, new Ausgabegrenze(8)));

        Assert.That(fehler.Grenze, Is.EqualTo(8));
    }

    private static GitCommitDateiquelle Quelle(RepoC c)
    {
        return new GitCommitDateiquelle(c.Ordner, new Quellenbuchung());
    }
}
