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

    [Test]
    public void Wenn_zweimal_abgeschlossen_dann_gewinnt_nur_der_erste_Aufruf()
    {
        var speicher = new Anmerkungsspeicher();

        var erster = speicher.VersucheAbzuschliessen();
        var zweiter = speicher.VersucheAbzuschliessen();

        Assert.That((erster, zweiter), Is.EqualTo((true, false)));
    }
}
