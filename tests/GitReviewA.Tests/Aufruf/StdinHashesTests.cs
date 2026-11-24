using System.Diagnostics;
using System.IO.Pipes;
using GitReviewA.Aufruf;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Aufruf;

public class StdinHashesTests
{
    private const string HashA = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";
    private const string HashC = "c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6";
    private static readonly TimeSpan Frist = TimeSpan.FromSeconds(10);

    [Test]
    public async Task Wenn_ein_Hash_je_Zeile_dann_Hashes_in_Reihenfolge_der_Eingabe()
    {
        var eingabe = new StringReader($"{HashC}\n{HashA}\n");

        var hashes = await StdinHashes.LesenAsync(eingabe, istTerminal: false, Frist);

        Assert.That(hashes.AlsArray(), Is.EqualTo(new[] { HashC, HashA }));
    }

    [Test]
    public async Task Wenn_Windows_Zeilenenden_Leerzeilen_und_Doppelte_dann_jeder_Hash_einmal_in_Eingabereihenfolge()
    {
        var eingabe = new StringReader($"{HashC}\r\n\r\n{HashA}\r\n{HashC}\r\n\n{HashA.ToUpperInvariant()}");

        var hashes = await StdinHashes.LesenAsync(eingabe, istTerminal: false, Frist);

        Assert.That(hashes.AlsArray(), Is.EqualTo(new[] { HashC, HashA }));
    }

    [Test]
    public async Task Wenn_letzte_Zeile_ohne_Zeilenende_dann_gelesen()
    {
        var eingabe = new StringReader($"{HashC}\n{HashA}");

        var hashes = await StdinHashes.LesenAsync(eingabe, istTerminal: false, Frist);

        Assert.That(hashes.AlsArray(), Is.EqualTo(new[] { HashC, HashA }));
    }

    [TestCase("")]
    [TestCase("\n\r\n\n")]
    public void Wenn_Eingabe_ohne_Hash_dann_Fehler_statt_einer_leeren_Auswahl(string eingabetext)
    {
        var eingabe = new StringReader(eingabetext);

        var fehler = Assert.ThrowsAsync<AuswahlFehler>(() => StdinHashes.LesenAsync(eingabe, istTerminal: false, Frist));

        Assert.That(fehler.Message, Does.Contain("ein Hash je Zeile"));
    }

    [Test]
    public void Wenn_Zeile_2_kein_Hash_dann_nennt_der_Fehler_die_Zeile_und_nicht_ihren_Text()
    {
        var eingabe = new StringReader($"{HashA}\nzzzz\n{HashC}\n");

        var fehler = Assert.ThrowsAsync<AuswahlFehler>(() => StdinHashes.LesenAsync(eingabe, istTerminal: false, Frist));

        Assert.That(fehler.Message, Does.Contain("Zeile 2"));
        Assert.That(fehler.Message, Does.Contain("ein Hash je Zeile"));
        Assert.That(fehler.Message, Does.Not.Contain("zzzz"));
    }

    [TestCase("--output=pwn")]
    [TestCase("HEAD")]
    [TestCase("a..b")]
    [TestCase(" abcd")]
    [TestCase("abc")]
    public void Wenn_erste_Zeile_kein_Hash_dann_Fehler_mit_Zeile_1(string zeile)
    {
        var eingabe = new StringReader($"{zeile}\n{HashA}\n");

        var fehler = Assert.ThrowsAsync<AuswahlFehler>(() => StdinHashes.LesenAsync(eingabe, istTerminal: false, Frist));

        Assert.That(fehler.Message, Does.Contain("Zeile 1"));
        Assert.That(fehler.Message, Does.Not.Contain(zeile.Trim()));
    }

    [Test]
    public void Wenn_Zeile_endlos_lang_dann_Fehler_ohne_die_Eingabe_weiterzulesen()
    {
        var eingabe = new EndloseEingabe('a');

        var fehler = Assert.ThrowsAsync<AuswahlFehler>(() => StdinHashes.LesenAsync(eingabe, istTerminal: false, Frist));

        Assert.That(fehler.Message, Does.Contain("Zeile 1"));
        Assert.That(eingabe.GeleseneZeichen, Is.InRange(101, 102));
    }

    [Test]
    public async Task Wenn_1000_verschiedene_Hashes_und_ein_doppelter_dann_alle_1000()
    {
        var hashes = VerschiedeneHashes(1000);
        var eingabe = new StringReader(string.Join('\n', hashes.Append(hashes[0])));

        var gelesen = await StdinHashes.LesenAsync(eingabe, istTerminal: false, Frist);

        Assert.That(gelesen.Anzahl, Is.EqualTo(1000));
    }

    [Test]
    public void Wenn_1001_verschiedene_Hashes_dann_Ablehnung_mit_der_Grenze_1_000()
    {
        var eingabe = new StringReader(string.Join('\n', VerschiedeneHashes(1001)));

        var fehler = Assert.ThrowsAsync<AuswahlFehler>(() => StdinHashes.LesenAsync(eingabe, istTerminal: false, Frist));

        Assert.That(fehler.Message, Does.Contain("1 000"));
    }

    [Test]
    public void Wenn_stdin_ein_Terminal_dann_Fehler_ohne_zu_lesen()
    {
        var eingabe = new EndloseEingabe('a');

        var fehler = Assert.ThrowsAsync<AuswahlFehler>(() => StdinHashes.LesenAsync(eingabe, istTerminal: true, Frist));

        Assert.That(fehler.Message, Does.Contain("ein Hash je Zeile"));
        Assert.That(fehler.Message, Does.Contain("Pipe"));
        Assert.That(eingabe.GeleseneZeichen, Is.Zero);
    }

    [Test]
    public void Wenn_offene_Pipe_nichts_liefert_dann_Fehler_nach_der_Frist_mit_der_Frist_in_der_Meldung()
    {
        var schreibseite = new AnonymousPipeServerStream(PipeDirection.Out);
        using var eingabe = new StreamReader(new AnonymousPipeClientStream(PipeDirection.In, schreibseite.ClientSafePipeHandle));
        var uhr = Stopwatch.StartNew();

        var fehler = Assert.ThrowsAsync<AuswahlFehler>(() => StdinHashes.LesenAsync(eingabe, istTerminal: false, TimeSpan.FromMilliseconds(300)));
        var gewartet = uhr.Elapsed;
        schreibseite.Dispose();

        Assert.That(gewartet, Is.InRange(TimeSpan.FromMilliseconds(250), TimeSpan.FromSeconds(5)));
        Assert.That(fehler.Message, Does.Contain("0,3 s"));
    }

    [Test]
    public void Wenn_Frist_10_Sekunden_dann_nennt_die_Meldung_10_s()
    {
        var meldung = StdinHashes.Fristmeldung(TimeSpan.FromSeconds(10));

        Assert.That(meldung, Does.Contain("10 s"));
    }

    private static string[] VerschiedeneHashes(int anzahl)
    {
        return Enumerable.Range(0, anzahl).Select(nummer => nummer.ToString("x8", System.Globalization.CultureInfo.InvariantCulture)).ToArray();
    }

    private sealed class EndloseEingabe(char zeichen) : TextReader
    {
        public int GeleseneZeichen { get; private set; }

        public override int Read()
        {
            GeleseneZeichen++;
            return zeichen;
        }
    }
}
