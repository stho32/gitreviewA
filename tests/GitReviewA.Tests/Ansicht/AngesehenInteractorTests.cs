using GitReviewA.Ansicht;
using GitReviewA.Haken;
using GitReviewA.Protokoll;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Ansicht;

/// <summary>
/// B4001: der <see cref="AngesehenInteractor"/> prüft die gemeldeten Stellen gegen die Übersicht — derselbe Schlüssel wie beim
/// Haken —, hält sie im Stand und lehnt die ganze Anfrage ab, wenn der Körper unvollständig ist, mehr als 200 Stellen kommen,
/// eine Stelle außerhalb der Auswahl oder gesperrt ist oder die Übersicht nicht gelesen werden kann (R00041).
/// </summary>
public class AngesehenInteractorTests
{
    private const string HashA = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";
    private const string FremderHash = "b1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";

    [Test]
    public void Wenn_zwei_Stellen_gemeldet_werden_dann_haelt_der_Stand_beide()
    {
        var (interactor, stand) = Baue(TestUebersichtsquelle.Mit(HashA, "alt.txt", "src/b.txt"));

        var ergebnis = interactor.Markiere(Anfrage((HashA, "alt.txt"), (HashA, "src/b.txt")));

        Assert.That(ergebnis.Ausgang, Is.EqualTo(Angesehenausgang.Markiert));
        Assert.That(ergebnis.Anzahl, Is.EqualTo(2));
        Assert.That(stand.Enthaelt(new Stelle(HashA, "alt.txt")), Is.True);
        Assert.That(stand.Enthaelt(new Stelle(HashA, "src/b.txt")), Is.True);
    }

    [Test]
    public void Wenn_dieselbe_Stelle_zweimal_gemeldet_wird_dann_zaehlt_der_Stand_sie_einmal()
    {
        var (interactor, _) = Baue(TestUebersichtsquelle.Mit(HashA, "alt.txt"));

        var erste = interactor.Markiere(Anfrage((HashA, "alt.txt")));
        var zweite = interactor.Markiere(Anfrage((HashA, "alt.txt")));

        Assert.That(erste.Anzahl, Is.EqualTo(1));
        Assert.That(zweite.Anzahl, Is.EqualTo(1));
    }

    [Test]
    public void Wenn_genau_200_Stellen_gemeldet_werden_dann_werden_sie_angenommen()
    {
        var pfade = Pfade(200);
        var (interactor, _) = Baue(TestUebersichtsquelle.Mit(HashA, pfade));

        var ergebnis = interactor.Markiere(AnfrageAus(Stellen(HashA, pfade)));

        Assert.That(ergebnis.Ausgang, Is.EqualTo(Angesehenausgang.Markiert));
        Assert.That(ergebnis.Anzahl, Is.EqualTo(200));
    }

    [Test]
    public void Wenn_201_Stellen_gemeldet_werden_dann_400_und_keine_gemerkt()
    {
        var pfade = Pfade(201);
        var (interactor, stand) = Baue(TestUebersichtsquelle.Mit(HashA, pfade));

        var ergebnis = interactor.Markiere(AnfrageAus(Stellen(HashA, pfade)));

        Assert.That(ergebnis.Ausgang, Is.EqualTo(Angesehenausgang.Ungueltig));
        Assert.That(ergebnis.Grund, Does.Contain("200"));
        Assert.That(stand.Anzahl, Is.Zero);
    }

    [TestCase("fremder Commit")]
    [TestCase("unbekannte Datei")]
    [TestCase("kurzer Hash")]
    [TestCase("Name mit Zeilenende")]
    public void Wenn_eine_Stelle_ausserhalb_der_Auswahl_ist_dann_400_und_auch_die_gueltige_nicht_gemerkt(string fall)
    {
        var (interactor, stand) = Baue(TestUebersichtsquelle.Mit(HashA, "alt.txt", "src/b.txt"));
        var stelle = StelleZumFall(fall);
        var anfrage = new Ansichtanfrage([new Ansichtsstelle(HashA, "alt.txt"), stelle]);

        var ergebnis = interactor.Markiere(anfrage);

        Assert.That(ergebnis.Ausgang, Is.EqualTo(Angesehenausgang.Ungueltig));
        Assert.That(ergebnis.Grund, Is.Not.Empty);
        Assert.That(stand.Anzahl, Is.Zero);
    }

    [Test]
    public void Wenn_eine_gesperrte_Stelle_gemeldet_wird_dann_400_mit_Sperrgrund_und_nichts_gemerkt()
    {
        var (interactor, stand) = Baue(TestUebersichtsquelle.MitSperre(HashA, "f.txt", "Diff nicht lesbar: Name nicht eindeutig", "g.txt"));

        var ergebnis = interactor.Markiere(Anfrage((HashA, "f.txt")));

        Assert.That(ergebnis.Ausgang, Is.EqualTo(Angesehenausgang.Ungueltig));
        Assert.That(ergebnis.Grund, Is.EqualTo("Diff nicht lesbar: Name nicht eindeutig"));
        Assert.That(stand.Anzahl, Is.Zero);
    }

    [Test]
    public void Wenn_die_Uebersicht_nicht_lesbar_ist_dann_500_und_nichts_gemerkt()
    {
        var (interactor, stand) = Baue(TestUebersichtsquelle.Scheiternd());

        var ergebnis = interactor.Markiere(Anfrage((HashA, "alt.txt")));

        Assert.That(ergebnis.Ausgang, Is.EqualTo(Angesehenausgang.NichtLesbar));
        Assert.That(stand.Anzahl, Is.Zero);
    }

    [Test]
    public void Wenn_die_Liste_fehlt_oder_leer_ist_dann_400()
    {
        var (interactor, stand) = Baue(TestUebersichtsquelle.Mit(HashA, "alt.txt"));

        var ohneListe = interactor.Markiere(new Ansichtanfrage(null));
        var leer = interactor.Markiere(new Ansichtanfrage([]));

        Assert.That((ohneListe.Ausgang, leer.Ausgang), Is.EqualTo((Angesehenausgang.Ungueltig, Angesehenausgang.Ungueltig)));
        Assert.That(stand.Anzahl, Is.Zero);
    }

    [Test]
    public void Wenn_die_Debug_Stufe_an_ist_dann_nennt_die_Zeile_nur_die_Anzahl_keinen_Namen()
    {
        var ziel = new StringWriter();
        var protokoll = new StderrProtokoll(ziel, TimeProvider.System, Protokollstufe.Debug);
        var stand = new Ansichtsstand();
        var interactor = new AngesehenInteractor(new GemerkteUebersicht(TestUebersichtsquelle.Mit(HashA, "alt.txt", "src/b.txt")), stand, protokoll);

        interactor.Markiere(Anfrage((HashA, "alt.txt"), (HashA, "src/b.txt")));

        Assert.That(ziel.ToString(), Does.Contain("2 Stellen angesehen"));
        Assert.That(ziel.ToString(), Does.Not.Contain("alt.txt"));
        Assert.That(ziel.ToString(), Does.Not.Contain("src/b.txt"));
    }

    [Test]
    public void Wenn_der_Stand_gelesen_wird_dann_stehen_die_Stellen_in_fester_Reihenfolge()
    {
        var (interactor, _) = Baue(TestUebersichtsquelle.Mit(HashA, "src/b.txt", "alt.txt"));

        interactor.Markiere(Anfrage((HashA, "src/b.txt"), (HashA, "alt.txt")));

        Assert.That(interactor.Angesehen().Select(stelle => stelle.Pfad), Is.EqualTo(new[] { "alt.txt", "src/b.txt" }));
    }

    private static Ansichtsstelle StelleZumFall(string fall)
    {
        switch (fall)
        {
            case "fremder Commit":
                return new Ansichtsstelle(FremderHash, "alt.txt");
            case "unbekannte Datei":
                return new Ansichtsstelle(HashA, "src/c.txt");
            case "kurzer Hash":
                return new Ansichtsstelle(HashA[..7], "alt.txt");
            default:
                return new Ansichtsstelle(HashA, "alt.txt\nsrc/b.txt");
        }
    }

    private static string[] Pfade(int anzahl)
    {
        var pfade = new string[anzahl];
        for (var nummer = 0; nummer < anzahl; nummer++)
        {
            pfade[nummer] = $"datei-{nummer:D3}.txt";
        }
        return pfade;
    }

    private static Ansichtsstelle[] Stellen(string hash, string[] pfade)
    {
        return pfade.Select(pfad => new Ansichtsstelle(hash, pfad)).ToArray();
    }

    private static Ansichtanfrage Anfrage(params (string Hash, string Pfad)[] stellen)
    {
        return AnfrageAus(stellen.Select(stelle => new Ansichtsstelle(stelle.Hash, stelle.Pfad)).ToArray());
    }

    private static Ansichtanfrage AnfrageAus(Ansichtsstelle[] stellen)
    {
        return new Ansichtanfrage(stellen.ToList());
    }

    private static (AngesehenInteractor Interactor, Ansichtsstand Stand) Baue(TestUebersichtsquelle quelle)
    {
        var stand = new Ansichtsstand();
        var protokoll = new StderrProtokoll(new StringWriter(), TimeProvider.System, Protokollstufe.Warnung);
        return (new AngesehenInteractor(new GemerkteUebersicht(quelle), stand, protokoll), stand);
    }
}
