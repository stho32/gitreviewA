using GitReviewA.Dateien;
using GitReviewA.Fremdtext;
using GitReviewA.Git;
using GitReviewA.Protokoll;
using GitReviewA.Sprung;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Sprung;

/// <summary>
/// B2005: die Zuordnung des <see cref="SprungInteractor"/> — Hash gegen die Aufrufmenge, Pfad über <see cref="GitReviewA.Diff.Namenspruefung"/>,
/// dann die Gründe aus <see cref="Sprungpfad"/> und dem Arbeitsbaum. Ein abgewiesener Pfad startet kein git: die Sprungquelle zählt
/// null Arbeitsbaumprüfungen. Ebene: Unit gegen den Interactor mit Testquellen.
/// </summary>
public class SprungInteractorTests
{
    private const string HashA = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";
    private const string Wurzel = "/repo-wurzel";

    [Test]
    public void Wenn_der_Hash_nicht_zur_Aufrufmenge_gehoert_dann_nicht_gefunden_ohne_Arbeitsbaumpruefung()
    {
        var aufbau = Aufbau.MitDateien(new Dateiaenderung("A", "src/a.txt", null, 1, 0));

        var ergebnis = aufbau.Lesen("HEAD", "src/a.txt");

        Assert.That(ergebnis.Ausgang, Is.EqualTo(Sprungausgang.NichtGefunden));
        Assert.That(aufbau.Quelle.Arbeitsbaumpruefungen, Is.Zero);
    }

    [Test]
    public void Wenn_der_Pfad_nicht_in_der_Dateiliste_steht_dann_nicht_gefunden_ohne_Arbeitsbaumpruefung()
    {
        var aufbau = Aufbau.MitDateien(new Dateiaenderung("A", "src/a.txt", null, 1, 0));

        var ergebnis = aufbau.Lesen(HashA, "nicht-da.txt");

        Assert.That(ergebnis.Ausgang, Is.EqualTo(Sprungausgang.NichtGefunden));
        Assert.That(aufbau.Quelle.Arbeitsbaumpruefungen, Is.Zero);
    }

    [Test]
    public void Wenn_zwei_Dateien_den_Anzeigenamen_tragen_dann_Grund_nicht_eindeutig_ohne_Arbeitsbaumpruefung()
    {
        var wörtlich = new Dateiaenderung("A", "f⟨0xFF⟩.txt", null, 1, 0);
        var mitByte = new Dateiaenderung("A", "f⟨0xFF⟩.txt", null, 1, 0, new Rohname("f\xFF.txt"u8.ToArray()));
        var aufbau = Aufbau.MitDateien(wörtlich, mitByte);

        var ergebnis = aufbau.Lesen(HashA, "f⟨0xFF⟩.txt");

        Assert.That(ergebnis, Is.EqualTo(Sprungergebnis.KeinSprung(Sprunggruende.NameNichtEindeutig)));
        Assert.That(aufbau.Quelle.Arbeitsbaumpruefungen, Is.Zero);
    }

    [Test]
    public void Wenn_der_Name_Rohbytes_traegt_dann_Grund_nicht_uebergebbar_ohne_Arbeitsbaumpruefung()
    {
        var mitByte = new Dateiaenderung("A", "f⟨0xFF⟩.txt", null, 1, 0, new Rohname("f\xFF.txt"u8.ToArray()));
        var aufbau = Aufbau.MitDateien(mitByte);

        var ergebnis = aufbau.Lesen(HashA, "f⟨0xFF⟩.txt");

        Assert.That(ergebnis, Is.EqualTo(Sprungergebnis.KeinSprung(Sprunggruende.NameNichtUebergebbar)));
        Assert.That(aufbau.Quelle.Arbeitsbaumpruefungen, Is.Zero);
    }

    [Test]
    public void Wenn_der_Name_einen_Zeilenumbruch_traegt_dann_Grund_nicht_uebergebbar_ohne_Arbeitsbaumpruefung()
    {
        var aufbau = Aufbau.MitDateien(new Dateiaenderung("A", "harmlos\ngeheim.txt", null, 1, 0));

        var ergebnis = aufbau.Lesen(HashA, "harmlos\ngeheim.txt");

        Assert.That(ergebnis, Is.EqualTo(Sprungergebnis.KeinSprung(Sprunggruende.NameNichtUebergebbar)));
        Assert.That(aufbau.Quelle.Arbeitsbaumpruefungen, Is.Zero);
    }

    [Test]
    public void Wenn_der_Status_geloescht_ist_dann_Grund_Datei_fehlt_ohne_Arbeitsbaumpruefung()
    {
        var aufbau = Aufbau.MitDateien(new Dateiaenderung("D", "README.md", null, 0, 2));

        var ergebnis = aufbau.Lesen(HashA, "README.md");

        Assert.That(ergebnis, Is.EqualTo(Sprungergebnis.KeinSprung(Sprunggruende.DateiFehlt)));
        Assert.That(aufbau.Quelle.Arbeitsbaumpruefungen, Is.Zero);
    }

    [Test]
    public void Wenn_der_Pfad_die_Wurzel_verlaesst_dann_Grund_Pfad_verlaesst_das_Repository_ohne_Arbeitsbaumpruefung()
    {
        var aufbau = Aufbau.MitDateien(new Dateiaenderung("M", "../README.md", null, 1, 1));

        var ergebnis = aufbau.Lesen(HashA, "../README.md");

        Assert.That(ergebnis, Is.EqualTo(Sprungergebnis.KeinSprung(Sprunggruende.PfadVerlaesstRepository)));
        Assert.That(aufbau.Quelle.Arbeitsbaumpruefungen, Is.Zero);
    }

    [Test]
    public void Wenn_die_Datei_im_Arbeitsbaum_fehlt_dann_Grund_Datei_fehlt_ohne_Arbeitsbaumpruefung()
    {
        var aufbau = Aufbau.MitDateien(new Dateiaenderung("M", "src/a.txt", null, 1, 1));
        aufbau.Quelle.SetzeVorhanden("/repo-wurzel/src/a.txt", Sprungvorhandensein.Fehlt);

        var ergebnis = aufbau.Lesen(HashA, "src/a.txt");

        Assert.That(ergebnis, Is.EqualTo(Sprungergebnis.KeinSprung(Sprunggruende.DateiFehlt)));
        Assert.That(aufbau.Quelle.Arbeitsbaumpruefungen, Is.Zero);
    }

    [Test]
    public void Wenn_ein_Symlink_aus_der_Wurzel_fuehrt_dann_Grund_Pfad_verlaesst_das_Repository()
    {
        var aufbau = Aufbau.MitDateien(new Dateiaenderung("A", "link.txt", null, 1, 0));
        aufbau.Quelle.SetzeVorhanden("/repo-wurzel/link.txt", Sprungvorhandensein.VerlaesstWurzel);

        var ergebnis = aufbau.Lesen(HashA, "link.txt");

        Assert.That(ergebnis, Is.EqualTo(Sprungergebnis.KeinSprung(Sprunggruende.PfadVerlaesstRepository)));
        Assert.That(aufbau.Quelle.Arbeitsbaumpruefungen, Is.Zero);
    }

    [Test]
    public void Wenn_alles_gueltig_ist_dann_Ziel_ohne_Zeile_und_unveraendert()
    {
        var aufbau = Aufbau.MitDateien(new Dateiaenderung("M", "src/a.txt", null, 1, 1));

        var ergebnis = aufbau.Lesen(HashA, "src/a.txt");

        Assert.That(ergebnis, Is.EqualTo(Sprungergebnis.Sprung("vscode://file/repo-wurzel/src/a.txt", false)));
        Assert.That(aufbau.Quelle.Arbeitsbaumpruefungen, Is.EqualTo(1));
    }

    [Test]
    public void Wenn_die_Datei_seit_dem_Commit_geaendert_ist_dann_geaendert_wahr()
    {
        var aufbau = Aufbau.MitDateien(new Dateiaenderung("M", "weg.txt", null, 1, 1));
        aufbau.Quelle.SetzeGeaendert(HashA, "weg.txt");

        var ergebnis = aufbau.Lesen(HashA, "weg.txt");

        Assert.That(ergebnis, Is.EqualTo(Sprungergebnis.Sprung("vscode://file/repo-wurzel/weg.txt", true)));
    }

    [Test]
    public void Wenn_die_Arbeitsbaumpruefung_scheitert_dann_nicht_lesbar()
    {
        var aufbau = Aufbau.MitDateien(new Dateiaenderung("M", "src/a.txt", null, 1, 1));
        aufbau.Quelle.ScheitertBeiArbeitsbaumpruefung = true;

        var ergebnis = aufbau.Lesen(HashA, "src/a.txt");

        Assert.That(ergebnis.Ausgang, Is.EqualTo(Sprungausgang.NichtLesbar));
    }

    private sealed class Aufbau
    {
        private readonly SprungInteractor interactor;

        private Aufbau(SprungInteractor interactor, TestSprungquelle quelle)
        {
            this.interactor = interactor;
            Quelle = quelle;
        }

        public TestSprungquelle Quelle { get; }

        public static Aufbau MitDateien(params Dateiaenderung[] dateien)
        {
            var commits = new Commitzeilen([new Commitzeile(HashA, "Anna Beispiel", "2026-03-04T09:15:00+01:00", "Start", "")]);
            var dateiquelle = new TestDateiquelle(new Dictionary<string, Dateiaenderungen> { [HashA] = new(dateien) });
            var quelle = new TestSprungquelle(Wurzel);
            var protokoll = new StderrProtokoll(new StringWriter(), TimeProvider.System, Protokollstufe.Debug);
            var interactor = new SprungInteractor(commits, new GemerkteDateiquelle(dateiquelle), quelle, protokoll);
            return new Aufbau(interactor, quelle);
        }

        public Sprungergebnis Lesen(string hash, string pfad)
        {
            return interactor.Lesen(new Sprunganfrage(hash, pfad));
        }
    }
}
