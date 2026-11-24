using GitReviewA.Diff;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Protokoll;
using GitReviewA.Tests.Hilfen;
using GitReviewA.Zusammen;

namespace GitReviewA.Tests.Zusammen;

/// <summary>
/// S2 (Nacharbeit I0010, Code-Review): der gemerkte Stand hält nur den Erfolg — ein gescheiterter Leseversuch wird beim nächsten
/// Zugriff wiederholt, wie die <see cref="GemerkteUebersicht"/> es tut. Sonst machte ein vorübergehender git-Fehler Zusammen und
/// Stapel für den ganzen Lauf unlesbar.
/// </summary>
public class ZusammenLesenInteractorTests
{
    private const string HashP = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";

    [Test]
    public void Wenn_der_erste_Leseversuch_scheitert_dann_liest_der_naechste_Zugriff_erneut()
    {
        var quelle = new TestZusammenquelle { ScheitertBeiNetto = true, GegebeneElternfolge = Einzelcommit() };
        var interactor = Interactor(quelle);

        var erster = interactor.Stand();
        quelle.ScheitertBeiNetto = false;
        quelle.GegebeneNetto = new Dateiaenderungen([new Dateiaenderung("A", "src/a.txt", null, 1, 0)]);
        var zweiter = interactor.Stand();

        Assert.That((erster.IstLesbar, zweiter.IstLesbar), Is.EqualTo((false, true)), "der Fehlschlag wird nicht gemerkt");
        Assert.That(quelle.NettoLesevorgaenge, Is.EqualTo(2));
    }

    [Test]
    public void Wenn_der_Stand_gelesen_ist_dann_liest_der_naechste_Zugriff_nicht_erneut()
    {
        var quelle = new TestZusammenquelle
        {
            GegebeneElternfolge = Einzelcommit(),
            GegebeneNetto = new Dateiaenderungen([new Dateiaenderung("A", "src/a.txt", null, 1, 0)]),
        };
        var interactor = Interactor(quelle);

        var erster = interactor.Stand();
        var zweiter = interactor.Stand();

        Assert.That((erster.IstLesbar, zweiter.IstLesbar), Is.EqualTo((true, true)));
        Assert.That(quelle.NettoLesevorgaenge, Is.EqualTo(1), "Commits sind unveränderlich, der Erfolg wird gemerkt");
    }

    private static ZusammenLesenInteractor Interactor(TestZusammenquelle quelle)
    {
        var commits = new Commitzeilen([new Commitzeile(HashP, "Anna Beispiel", "2026-03-04T09:15:00+01:00", "Start", "")]);
        var uebersicht = TestUebersichtsquelle.MitDateien(new Commitdateien(HashP, new Dateiaenderungen([new Dateiaenderung("A", "src/a.txt", null, 1, 0)])));
        var protokoll = new StderrProtokoll(new StringWriter(), TimeProvider.System, Protokollstufe.Warnung);
        return new ZusammenLesenInteractor(commits, new GemerkteUebersicht(uebersicht), quelle, TestDiffquelle.Leer(), protokoll);
    }

    private static Elternfolge Einzelcommit()
    {
        return new Elternfolge([new Elternzeile(HashP, "")]);
    }
}