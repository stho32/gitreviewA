using GitReviewA.Anmerkungen;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Anmerkungen;

public class AnmerkungsspeicherTests
{
    private const string HashA = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";
    private const string HashB = "b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5";

    [Test]
    public void Wenn_zwei_angehaengt_dann_Nummern_1_und_2_und_Schnappschuss_in_Anlegereihenfolge()
    {
        var speicher = new Anmerkungsspeicher();

        var ersteAngehaengt = speicher.VersucheAnzuhaengen(new GepruefteAnmerkung(HashA, "src/Foo.cs", 42, "Null-Prüfung fehlt"), out var erste);
        var zweiteAngehaengt = speicher.VersucheAnzuhaengen(new GepruefteAnmerkung(HashB, "README.md", null, "veraltet"), out var zweite);

        Assert.That((ersteAngehaengt, zweiteAngehaengt), Is.EqualTo((true, true)));
        Assert.That(speicher.Schnappschuss().AlsArray(), Is.EqualTo(new[]
        {
            new Anmerkung(1, HashA, "src/Foo.cs", 42, "Null-Prüfung fehlt"),
            new Anmerkung(2, HashB, "README.md", null, "veraltet"),
        }));
        Assert.That((erste?.Nummer, zweite?.Nummer), Is.EqualTo((1, 2)));
    }

    [Test]
    public void Wenn_nichts_angehaengt_dann_Schnappschuss_leer_und_nicht_abgeschlossen()
    {
        var speicher = new Anmerkungsspeicher();

        var schnappschuss = speicher.Schnappschuss();

        Assert.That(schnappschuss.Anzahl, Is.Zero);
        Assert.That(speicher.IstAbgeschlossen, Is.False);
    }

    [Test]
    public async Task Wenn_200_parallel_angehaengt_dann_Nummern_1_bis_200_lueckenlos_und_Schnappschuss_nach_Nummer()
    {
        var speicher = new Anmerkungsspeicher();
        using var start = new Barrier(8);

        var aufgaben = Enumerable.Range(0, 8).Select(aufgabe => Task.Run(() =>
        {
            start.SignalAndWait();
            for (var schritt = 0; schritt < 25; schritt++)
            {
                speicher.VersucheAnzuhaengen(new GepruefteAnmerkung(HashA, "datei.txt", schritt + 1, $"Aufgabe {aufgabe}"), out _);
            }
        }));
        await Task.WhenAll(aufgaben);

        var nummern = speicher.Schnappschuss().AlsArray().Select(anmerkung => anmerkung.Nummer);
        Assert.That(nummern, Is.EqualTo(Enumerable.Range(1, 200)));
    }

    [Test]
    public void Wenn_abgeschlossen_dann_Anhaengen_abgelehnt_und_Schnappschuss_unveraendert()
    {
        var speicher = new Anmerkungsspeicher();
        speicher.VersucheAnzuhaengen(new GepruefteAnmerkung(HashA, "datei.txt", 1, "vorher"), out _);

        var abgeschlossen = speicher.VersucheAbzuschliessen();
        var angehaengt = speicher.VersucheAnzuhaengen(new GepruefteAnmerkung(HashA, "datei.txt", 2, "danach"), out var abgelehnt);

        Assert.That(abgeschlossen, Is.True);
        Assert.That(speicher.IstAbgeschlossen, Is.True);
        Assert.That(angehaengt, Is.False);
        Assert.That(abgelehnt, Is.Null);
        Assert.That(speicher.Schnappschuss().AlsArray().Select(anmerkung => anmerkung.Text), Is.EqualTo(new[] { "vorher" }));
    }

    [TestCase(true)]
    [TestCase(false)]
    public void Wenn_Nummer_1_geaendert_dann_Geaendert_mit_neuem_Text_und_gleicher_Nummer_Stelle_und_Position(bool mitZeile)
    {
        var speicher = new Anmerkungsspeicher();
        var zeile = mitZeile ? 18 : (int?)null;
        speicher.VersucheAnzuhaengen(new GepruefteAnmerkung(HashA, "lang.txt", zeile, "Klammer fehlt"), out _);
        speicher.VersucheAnzuhaengen(new GepruefteAnmerkung(HashB, "src/b.txt", 2, "zweiter"), out _);

        var ausgang = speicher.VersucheZuAendern(1, "Klammer und Typprüfung fehlt", out var geaendert);

        Assert.That((ausgang, geaendert), Is.EqualTo((Aenderungsausgang.Geaendert, new Anmerkung(1, HashA, "lang.txt", zeile, "Klammer und Typprüfung fehlt"))));
        Assert.That(speicher.Schnappschuss().AlsArray(), Is.EqualTo(new[]
        {
            new Anmerkung(1, HashA, "lang.txt", zeile, "Klammer und Typprüfung fehlt"),
            new Anmerkung(2, HashB, "src/b.txt", 2, "zweiter"),
        }));
    }

    [Test]
    public void Wenn_Nummer_unbekannt_dann_NichtGefunden_und_Schnappschuss_unveraendert()
    {
        var speicher = new Anmerkungsspeicher();
        speicher.VersucheAnzuhaengen(new GepruefteAnmerkung(HashA, "lang.txt", 18, "erster"), out _);
        var vorher = speicher.Schnappschuss().AlsArray();

        var ausgang = speicher.VersucheZuAendern(7, "neu", out var geaendert);

        Assert.That((ausgang, geaendert), Is.EqualTo((Aenderungsausgang.NichtGefunden, (Anmerkung?)null)));
        Assert.That(speicher.Schnappschuss().AlsArray(), Is.EqualTo(vorher));
    }

    [Test]
    public void Wenn_zweimal_geaendert_dann_steht_genau_eine_Anmerkung_mit_dem_zweiten_Text()
    {
        var speicher = new Anmerkungsspeicher();
        speicher.VersucheAnzuhaengen(new GepruefteAnmerkung(HashA, "lang.txt", 18, "alt"), out _);

        var erster = speicher.VersucheZuAendern(1, "mittig", out _);
        var zweiter = speicher.VersucheZuAendern(1, "neu", out var geaendert);

        Assert.That((erster, zweiter), Is.EqualTo((Aenderungsausgang.Geaendert, Aenderungsausgang.Geaendert)));
        Assert.That(geaendert?.Text, Is.EqualTo("neu"));
        Assert.That(speicher.Schnappschuss().AlsArray().Select(anmerkung => (anmerkung.Nummer, anmerkung.Text)), Is.EqualTo(new[] { (1, "neu") }));
        Assert.That(speicher.Schnappschuss().Anzahl, Is.EqualTo(1), "die Änderung verbraucht keine Nummer und legt nichts an");
    }

    [Test]
    public void Wenn_abgeschlossen_dann_Aendern_abgelehnt_mit_Beendet_und_Text_bleibt()
    {
        var speicher = new Anmerkungsspeicher();
        speicher.VersucheAnzuhaengen(new GepruefteAnmerkung(HashA, "lang.txt", 18, "vorher"), out _);
        speicher.VersucheAbzuschliessen();

        var ausgang = speicher.VersucheZuAendern(1, "danach", out var geaendert);

        Assert.That((ausgang, geaendert), Is.EqualTo((Aenderungsausgang.Beendet, (Anmerkung?)null)));
        Assert.That(speicher.Schnappschuss().AlsArray().Select(anmerkung => anmerkung.Text), Is.EqualTo(new[] { "vorher" }));
    }

    [Test]
    public void Wenn_Finde_mit_bekannter_und_unbekannter_Nummer_dann_die_Anmerkung_oder_null()
    {
        var speicher = new Anmerkungsspeicher();
        speicher.VersucheAnzuhaengen(new GepruefteAnmerkung(HashA, "lang.txt", 18, "erster"), out _);

        Assert.That(speicher.Finde(1), Is.EqualTo(new Anmerkung(1, HashA, "lang.txt", 18, "erster")));
        Assert.That(speicher.Finde(2), Is.Null);
    }

    [Test]
    public async Task Wenn_200_Anmerkungen_parallel_geaendert_dann_bleiben_Nummern_und_Reihenfolge_und_jeder_Text_steht_an_seiner_Nummer()
    {
        var speicher = new Anmerkungsspeicher();
        for (var nummer = 1; nummer <= 200; nummer++)
        {
            speicher.VersucheAnzuhaengen(new GepruefteAnmerkung(HashA, "datei.txt", nummer, $"alt {nummer}"), out _);
        }
        using var start = new Barrier(8);

        var aufgaben = Enumerable.Range(0, 8).Select(aufgabe => Task.Run(() =>
        {
            start.SignalAndWait();
            for (var schritt = 0; schritt < 25; schritt++)
            {
                var nummer = aufgabe * 25 + schritt + 1;
                speicher.VersucheZuAendern(nummer, $"neu {nummer}", out _);
            }
        }));
        await Task.WhenAll(aufgaben);

        var geaenderte = speicher.Schnappschuss().AlsArray();
        Assert.That(geaenderte.Select(anmerkung => anmerkung.Nummer), Is.EqualTo(Enumerable.Range(1, 200)));
        Assert.That(geaenderte.Select(anmerkung => anmerkung.Text), Is.EqualTo(Enumerable.Range(1, 200).Select(nummer => $"neu {nummer}")));
    }

    [Test]
    public void Wenn_zweimal_abgeschlossen_dann_gewinnt_nur_der_erste_Aufruf()
    {
        var speicher = new Anmerkungsspeicher();

        var erster = speicher.VersucheAbzuschliessen();
        var zweiter = speicher.VersucheAbzuschliessen();

        Assert.That((erster, zweiter), Is.EqualTo((true, false)));
    }

    [Test]
    public void Wenn_Nummer_2_von_drei_geloescht_dann_Geloescht_und_die_uebrigen_behalten_ihre_Reihenfolge()
    {
        var speicher = new Anmerkungsspeicher();
        speicher.VersucheAnzuhaengen(new GepruefteAnmerkung(HashA, "lang.txt", 18, "erster"), out _);
        speicher.VersucheAnzuhaengen(new GepruefteAnmerkung(HashB, "src/b.txt", 2, "zweiter"), out _);
        speicher.VersucheAnzuhaengen(new GepruefteAnmerkung(HashA, "README.md", null, "dritter"), out _);

        var ausgang = speicher.VersucheZuLoeschen(2, out var geloescht);

        Assert.That((ausgang, geloescht), Is.EqualTo((Loeschungsausgang.Geloescht, new Anmerkung(2, HashB, "src/b.txt", 2, "zweiter"))));
        Assert.That(speicher.Schnappschuss().AlsArray(), Is.EqualTo(new[]
        {
            new Anmerkung(1, HashA, "lang.txt", 18, "erster"),
            new Anmerkung(3, HashA, "README.md", null, "dritter"),
        }));
        Assert.That(speicher.Schnappschuss().Anzahl, Is.EqualTo(2));
    }

    [Test]
    public void Wenn_Nummer_unbekannt_dann_Loeschen_NichtGefunden_und_Schnappschuss_unveraendert()
    {
        var speicher = new Anmerkungsspeicher();
        speicher.VersucheAnzuhaengen(new GepruefteAnmerkung(HashA, "lang.txt", 18, "erster"), out _);
        var vorher = speicher.Schnappschuss().AlsArray();

        var ausgang = speicher.VersucheZuLoeschen(7, out var geloescht);

        Assert.That((ausgang, geloescht), Is.EqualTo((Loeschungsausgang.NichtGefunden, (Anmerkung?)null)));
        Assert.That(speicher.Schnappschuss().AlsArray(), Is.EqualTo(vorher));
    }

    [Test]
    public void Wenn_zweimal_dieselbe_Nummer_geloescht_dann_NichtGefunden_und_nur_eine_weg()
    {
        var speicher = new Anmerkungsspeicher();
        speicher.VersucheAnzuhaengen(new GepruefteAnmerkung(HashA, "lang.txt", 18, "erster"), out _);
        speicher.VersucheAnzuhaengen(new GepruefteAnmerkung(HashB, "src/b.txt", 2, "zweiter"), out _);

        var erster = speicher.VersucheZuLoeschen(1, out _);
        var zweiter = speicher.VersucheZuLoeschen(1, out var geloescht);

        Assert.That((erster, zweiter, geloescht), Is.EqualTo((Loeschungsausgang.Geloescht, Loeschungsausgang.NichtGefunden, (Anmerkung?)null)));
        Assert.That(speicher.Schnappschuss().AlsArray(), Is.EqualTo(new[] { new Anmerkung(2, HashB, "src/b.txt", 2, "zweiter") }));
    }

    [Test]
    public void Wenn_die_geloeschte_Nummer_frei_waere_dann_bekommt_die_naechste_Anhaengung_die_folgende_Nummer()
    {
        var speicher = new Anmerkungsspeicher();
        speicher.VersucheAnzuhaengen(new GepruefteAnmerkung(HashA, "lang.txt", 1, "eins"), out _);
        speicher.VersucheAnzuhaengen(new GepruefteAnmerkung(HashA, "lang.txt", 2, "zwei"), out _);
        speicher.VersucheAnzuhaengen(new GepruefteAnmerkung(HashA, "lang.txt", 3, "drei"), out _);

        speicher.VersucheZuLoeschen(2, out _);
        speicher.VersucheAnzuhaengen(new GepruefteAnmerkung(HashA, "lang.txt", 4, "vier"), out var vierte);

        Assert.That(vierte?.Nummer, Is.EqualTo(4), "die gelöschte Nummer wird nicht wiederverwendet");
        Assert.That(speicher.Schnappschuss().AlsArray().Select(anmerkung => anmerkung.Nummer), Is.EqualTo(new[] { 1, 3, 4 }));
    }

    [TestCase(true)]
    [TestCase(false)]
    public void Wenn_eine_Anmerkung_geloescht_wird_dann_traegt_die_Rueckgabe_ihre_Stelle(bool mitZeile)
    {
        var speicher = new Anmerkungsspeicher();
        var zeile = mitZeile ? 18 : (int?)null;
        speicher.VersucheAnzuhaengen(new GepruefteAnmerkung(HashA, "README.md", zeile, "veraltet"), out _);

        var ausgang = speicher.VersucheZuLoeschen(1, out var geloescht);

        Assert.That((ausgang, geloescht), Is.EqualTo((Loeschungsausgang.Geloescht, new Anmerkung(1, HashA, "README.md", zeile, "veraltet"))));
        Assert.That(speicher.Schnappschuss().Anzahl, Is.Zero);
    }

    [Test]
    public void Wenn_abgeschlossen_dann_Loeschen_abgelehnt_mit_Beendet_und_Schnappschuss_unveraendert()
    {
        var speicher = new Anmerkungsspeicher();
        speicher.VersucheAnzuhaengen(new GepruefteAnmerkung(HashA, "lang.txt", 18, "vorher"), out _);
        speicher.VersucheAbzuschliessen();

        var ausgang = speicher.VersucheZuLoeschen(1, out var geloescht);

        Assert.That((ausgang, geloescht), Is.EqualTo((Loeschungsausgang.Beendet, (Anmerkung?)null)));
        Assert.That(speicher.Schnappschuss().AlsArray().Select(anmerkung => anmerkung.Text), Is.EqualTo(new[] { "vorher" }));
    }

    [Test]
    public async Task Wenn_200_parallel_geloescht_dann_bleibt_kein_Eintrag_und_kein_Fehler()
    {
        var speicher = new Anmerkungsspeicher();
        for (var nummer = 1; nummer <= 200; nummer++)
        {
            speicher.VersucheAnzuhaengen(new GepruefteAnmerkung(HashA, "datei.txt", nummer, $"Anmerkung {nummer}"), out _);
        }
        using var start = new Barrier(8);

        var aufgaben = Enumerable.Range(0, 8).Select(aufgabe => Task.Run(() =>
        {
            start.SignalAndWait();
            for (var schritt = 0; schritt < 25; schritt++)
            {
                var nummer = aufgabe * 25 + schritt + 1;
                Assert.That(speicher.VersucheZuLoeschen(nummer, out _), Is.EqualTo(Loeschungsausgang.Geloescht));
            }
        }));
        await Task.WhenAll(aufgaben);

        Assert.That(speicher.Schnappschuss().Anzahl, Is.Zero);
    }
}
