using GitReviewA.Aufruf;
using GitReviewA.Dateiansicht;
using GitReviewA.Git;
using GitReviewA.Protokoll;

namespace GitReviewA.Tests.Dateiansicht;

/// <summary>
/// R00046 Kriterien 1 (Text), 2 (Tabelle der Gründe), 4 (kleine Grenze), 5 (Unterordner) und 6 (gemischte Liste) gegen den
/// <see cref="DateiansichtStartInteractor"/>: eine Commitquelle wird wie eine Datei vom Datenträger eingeordnet, der Anzeigename
/// ist `<Kurzhash>:<Pfad>`, der Kopf trägt den vollen Hash. Ebene: Integration gegen den Interactor, git gegen Repo C.
/// </summary>
[NonParallelizable]
public class DateiansichtCommitTests
{
    [Test]
    public void Wenn_eine_Commitquelle_gezeigt_wird_dann_der_Stand_aus_c1_mit_Anzeigename_und_vollen_Hash()
    {
        using var c = RepoC.Anlegen();

        var ausgang = Starte(c, $"{c.C1}:sql/a.sql");

        Assert.That(ausgang.IstErfolg, Is.True);
        var eintrag = ausgang.Stand?[0] ?? throw new InvalidOperationException();
        Assert.That(eintrag.Anzeigename, Is.EqualTo($"{c.C1[..7]}:sql/a.sql"));
        Assert.That(eintrag.EchterPfad, Is.EqualTo(c.C1));
        Assert.That(eintrag.Text.Text, Is.EqualTo("SELECT 1;\n"));
        Assert.That(eintrag.Text.Groesse, Is.EqualTo(10));
        Assert.That(eintrag.Text.Zeilen, Is.EqualTo(1));
        Assert.That(eintrag.Text.Kodierungstext, Is.EqualTo("UTF-8"));
        Assert.That(eintrag.Text.Zeilenendetext, Is.EqualTo("LF"));
    }

    [Test]
    public void Wenn_c2_und_der_Arbeitsbaum_abweichen_dann_zeigt_die_Commitquelle_den_Stand_aus_c1()
    {
        using var c = RepoC.Anlegen();
        Assert.That(File.ReadAllText(c.Pfad("sql/a.sql")), Is.EqualTo("SELECT 3;\n"), "der Arbeitsbaum ist geändert");

        var ausC2 = Starte(c, $"{c.C2}:sql/a.sql");

        Assert.That(ausC2.Stand?[0].Text.Text, Is.EqualTo("SELECT 2;\n"));
    }

    [TestCase("sql/fehlt.sql", (int)Quellengrundart.PfadImCommitNichtGefunden)]
    [TestCase("sql/alt", (int)Quellengrundart.IstImCommitEinVerzeichnis)]
    [TestCase("sql/alt/", (int)Quellengrundart.IstImCommitEinVerzeichnis)]
    [TestCase("link.sql", (int)Quellengrundart.IstImCommitEinSymbolischerLink)]
    [TestCase("sub", (int)Quellengrundart.IstImCommitEinSubmodul)]
    [TestCase("sql/gross.bin", (int)Quellengrundart.Binaerdatei)]
    [TestCase("sql/a.sql/", (int)Quellengrundart.PfadImCommitNichtGefunden)]
    [TestCase("(top)sql/a.sql", (int)Quellengrundart.PfadImCommitNichtGefunden)]
    public void Wenn_die_Commitquelle_nicht_zeigbar_ist_dann_genau_dieser_Grund_ohne_Stand(string pfad, int erwartet)
    {
        using var c = RepoC.Anlegen();

        var ausgang = Starte(c, $"{c.C1}:{pfad}");

        Assert.That(ausgang.IstErfolg, Is.False);
        Assert.That(ausgang.Stand, Is.Null);
        Assert.That(ausgang.Fehler, Has.Count.EqualTo(1));
        Assert.That((int)(ausgang.Fehler[0].Grund?.Art ?? 0), Is.EqualTo(erwartet));
    }

    [Test]
    public void Wenn_der_Commit_unbekannt_ist_dann_Commit_nicht_gefunden()
    {
        using var c = RepoC.Anlegen();

        var ausgang = Starte(c, "deadbeef:sql/a.sql");

        Assert.That(ausgang.Fehler[0].Grund?.Art, Is.EqualTo(Quellengrundart.CommitNichtGefunden));
    }

    [Test]
    public void Wenn_ein_Tag_wie_das_Praefix_heisst_dann_mehrdeutig_und_kein_Inhalt()
    {
        using var c = RepoC.Anlegen();
        var praefix = c.C2[..7];
        Assert.That(c.C1.StartsWith(praefix, StringComparison.OrdinalIgnoreCase), Is.False);
        c.Git("tag", praefix, c.C1);

        var ausgang = Starte(c, $"{praefix}:sql/a.sql");

        Assert.That(ausgang.IstErfolg, Is.False);
        Assert.That(ausgang.Stand, Is.Null);
        Assert.That(ausgang.Fehler[0].Grund?.Art, Is.EqualTo(Quellengrundart.CommitMehrdeutig));
        Assert.That(QuellengrundMeldungen.Meldung(ausgang.Fehler[0].Grund!), Does.Contain("vollen Hash angeben"));
    }

    [Test]
    public void Wenn_der_Pfad_leer_ist_dann_Datentraeger_und_nicht_gefunden()
    {
        using var c = RepoC.Anlegen();

        var ausgang = Starte(c, $"{c.C1}:");

        Assert.That(ausgang.Fehler[0].Grund?.Art, Is.EqualTo(Quellengrundart.DateiNichtGefunden));
    }

    [Test]
    public void Wenn_Punkt_Schraegstrich_vorn_steht_dann_Datentraeger_und_nicht_gefunden()
    {
        using var c = RepoC.Anlegen();

        var ausgang = Starte(c, $"./{c.C1}:sql/a.sql");

        Assert.That(ausgang.Fehler[0].Grund?.Art, Is.EqualTo(Quellengrundart.DateiNichtGefunden));
    }

    [Test]
    public void Wenn_der_Commitpfad_einen_Zeilenumbruch_traegt_dann_Name_nicht_uebergebbar_auch_ohne_Repository()
    {
        using var d = OrdnerD.Anlegen();

        var ausgang = StarteIn(d.Ordner, "abcdef:sql/a\nb.sql");

        Assert.That(ausgang.IstErfolg, Is.False);
        Assert.That(ausgang.Fehler[0].Grund?.Art, Is.EqualTo(Quellengrundart.NameNichtUebergebbar));
    }

    [Test]
    public void Wenn_der_Name_unsichtbare_Zeichen_traegt_dann_Marken_im_Anzeigenamen()
    {
        using var c = RepoC.Anlegen();

        var ausgang = Starte(c, $"{c.C1}:x\u202e.sql");

        Assert.That(ausgang.IstErfolg, Is.True);
        Assert.That(ausgang.Stand?[0].Anzeigename, Is.EqualTo($"{c.C1[..7]}:x⟨U+202E⟩.sql"));
    }

    [Test]
    public void Wenn_der_Start_im_Unterordner_ist_dann_zeigen_beide_Angaben_dieselbe_Datei()
    {
        using var c = RepoC.Anlegen();

        var wurzelrelativ = StarteIn(c.Pfad("sql"), $"{c.C1}:sql/a.sql");
        var startrelativ = StarteIn(c.Pfad("sql"), $"{c.C1}:./a.sql");
        var nurName = StarteIn(c.Pfad("sql"), $"{c.C1}:a.sql");

        Assert.That(wurzelrelativ.Stand?[0].Anzeigename, Is.EqualTo($"{c.C1[..7]}:sql/a.sql"));
        Assert.That(startrelativ.Stand?[0].Anzeigename, Is.EqualTo($"{c.C1[..7]}:sql/a.sql"));
        Assert.That(startrelativ.Stand?[0].Text.Text, Is.EqualTo("SELECT 1;\n"));
        Assert.That(nurName.Fehler[0].Grund?.Art, Is.EqualTo(Quellengrundart.PfadImCommitNichtGefunden));
    }

    [Test]
    public void Wenn_Datentraeger_und_Commit_gemischt_sind_dann_stehen_beide_in_Aufrufreihenfolge()
    {
        using var c = RepoC.Anlegen();

        var ausgang = InOrdner(c.Ordner, () => StarteIn(c.Ordner, "sql/a.sql", $"{c.C1}:sql/a.sql"));

        Assert.That(ausgang.IstErfolg, Is.True);
        var stand = ausgang.Stand ?? throw new InvalidOperationException();
        Assert.That(stand.Anzahl, Is.EqualTo(2));
        Assert.That(stand[0].Anzeigename, Is.EqualTo("sql/a.sql"));
        Assert.That(stand[0].Text.Text, Is.EqualTo("SELECT 3;\n")); // der Arbeitsbaum
        Assert.That(stand[1].Anzeigename, Is.EqualTo($"{c.C1[..7]}:sql/a.sql"));
        Assert.That(stand[1].Text.Text, Is.EqualTo("SELECT 1;\n")); // der Commit
    }

    [Test]
    public void Wenn_zwei_Wortlaute_der_Commitquelle_genannt_sind_dann_zwei_Zeilen_mit_gleichen_Bytes()
    {
        using var c = RepoC.Anlegen();

        var ausgang = Starte(c, $"{c.C1[..7]}:sql/a.sql", $"{c.C1}:sql/a.sql");

        Assert.That(ausgang.Stand?.Anzahl, Is.EqualTo(2));
        Assert.That(ausgang.Stand?[0].Text.Text, Is.EqualTo(ausgang.Stand?[1].Text.Text));
    }

    [Test]
    public void Wenn_die_Grenze_klein_ist_dann_zu_gross_schon_am_Eintrag_Aufruf()
    {
        using var c = RepoC.Anlegen();
        var buchung = new Quellenbuchung();
        var interactor = new DateiansichtStartInteractor(new DateiLeser(buchung), new GitCommitDateiquelle(c.Ordner, buchung), new Ausgabegrenze(16));

        var ausgang = interactor.Starte(new Dateiaufruf([$"{c.C1}:sql/a.sql"], 0, BrowserOeffnen: false, Protokollstufe.Warnung));

        Assert.That(ausgang.IstErfolg, Is.False);
        Assert.That(ausgang.Stand, Is.Null);
        Assert.That(ausgang.Fehler[0].Grund?.Art, Is.EqualTo(Quellengrundart.ZuGross));
    }

    [Test]
    public void Wenn_der_Eintrag_ueber_der_Grenze_meldet_dann_zu_gross_vor_dem_Lesen()
    {
        var quelle = new FakeCommitquelle(new CommitEintrag("a.sql", Baumart.Datei, 100), null, Bloblesung.Gelesen("zu spät"u8.ToArray()));
        var interactor = new DateiansichtStartInteractor(new DateiLeser(new Quellenbuchung()), quelle, new Ausgabegrenze(50));

        var ausgang = interactor.Starte(new Dateiaufruf(["0123456789:a.sql"], 0, BrowserOeffnen: false, Protokollstufe.Warnung));

        Assert.That(ausgang.Fehler[0].Grund?.Art, Is.EqualTo(Quellengrundart.ZuGross));
        Assert.That(quelle.BlobWurdeGelesen, Is.False);
    }

    [Test]
    public void Wenn_der_Eintrag_eine_zu_kleine_Groesse_meldet_dann_greift_die_Grenze_beim_Lesen()
    {
        var quelle = new FakeCommitquelle(new CommitEintrag("a.sql", Baumart.Datei, 5), null, Bloblesung.Abgelehnt(Quellengrund.ZuGross));
        var interactor = new DateiansichtStartInteractor(new DateiLeser(new Quellenbuchung()), quelle, new Ausgabegrenze(50));

        var ausgang = interactor.Starte(new Dateiaufruf(["0123456789:a.sql"], 0, BrowserOeffnen: false, Protokollstufe.Warnung));

        Assert.That(ausgang.Fehler[0].Grund?.Art, Is.EqualTo(Quellengrundart.ZuGross));
    }

    private static Startausgang Starte(RepoC c, params string[] angaben)
    {
        return StarteIn(c.Ordner, angaben);
    }

    private static Startausgang StarteIn(string ordner, params string[] angaben)
    {
        var buchung = new Quellenbuchung();
        var interactor = new DateiansichtStartInteractor(new DateiLeser(buchung), new GitCommitDateiquelle(ordner, buchung));
        return interactor.Starte(new Dateiaufruf(angaben, 0, BrowserOeffnen: false, Protokollstufe.Warnung));
    }

    private static Startausgang InOrdner(string ordner, Func<Startausgang> arbeit)
    {
        var vorher = Directory.GetCurrentDirectory();
        Directory.SetCurrentDirectory(ordner);
        try
        {
            return arbeit();
        }
        finally
        {
            Directory.SetCurrentDirectory(vorher);
        }
    }

    /// <summary>Eine Commitquelle mit vorgegebenem Eintrag und Blob — nur für die Grenzprüfung des Interactors, git-frei.</summary>
    private sealed class FakeCommitquelle(CommitEintrag? eintrag, Quellengrund? eintragsgrund, Bloblesung blob) : ICommitDateiquelle
    {
        private const string VollerHash = "0123456789012345678901234567890123456789";

        public bool BlobWurdeGelesen { get; private set; }

        public Commitaufloesung Aufloese(string hashEingabe)
        {
            return Commitaufloesung.Erkannt(VollerHash);
        }

        public Eintragsergebnis Eintrag(string vollerHash, string pfad, Ausgabegrenze grenze)
        {
            return eintrag is null
                ? Eintragsergebnis.Abgelehnt(eintragsgrund ?? Quellengrund.PfadImCommitNichtGefunden)
                : Eintragsergebnis.Gefunden(eintrag);
        }

        public Bloblesung Blob(string vollerHash, string pfad, Ausgabegrenze grenze)
        {
            BlobWurdeGelesen = true;
            return blob;
        }
    }
}
