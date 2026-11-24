using GitReviewA.Aufruf;

namespace GitReviewA.Tests.Aufruf;

public class AufruffehlerMeldungenTests
{
    private static readonly Aufrufgrund[] AlleGruende =
    [
        Aufrufgrund.KeinRepository,
        Aufrufgrund.NacktesRepository,
        Aufrufgrund.GitNichtGefunden,
        Aufrufgrund.LeereAuswahl,
        Aufrufgrund.AuswahlNichtAufloesbar,
    ];

    [Test]
    public void Wenn_jeder_Grund_dann_deutsche_Meldung_mit_Ausweg_ohne_rohen_git_Text()
    {
        foreach (var grund in AlleGruende)
        {
            var meldung = AufruffehlerMeldungen.Meldung(grund);

            Assert.That(meldung, Is.Not.Empty, $"Grund {grund}");
            Assert.That(meldung, Does.Not.Contain("fatal:"), $"Grund {grund}");
            Assert.That(meldung, Does.Contain("bitte"), $"Grund {grund}");
        }
    }

    [Test]
    public void Wenn_jeder_Grund_dann_Exit_Code_2()
    {
        Assert.That(AufruffehlerMeldungen.ExitCode, Is.EqualTo(2));
        foreach (var grund in AlleGruende)
        {
            Assert.That(Aufruffehler.Fuer(grund).ExitCode, Is.EqualTo(2), $"Grund {grund}");
        }
    }

    [Test]
    public void Wenn_Fuer_dann_traegt_der_Fehler_Grund_Meldung_und_Exit_Code()
    {
        var fehler = Aufruffehler.Fuer(Aufrufgrund.LeereAuswahl);

        Assert.That(fehler.Grund, Is.EqualTo(Aufrufgrund.LeereAuswahl));
        Assert.That(fehler.Meldung, Is.EqualTo(AufruffehlerMeldungen.Meldung(Aufrufgrund.LeereAuswahl)));
        Assert.That(fehler.ExitCode, Is.EqualTo(2));
    }

    [Test]
    public void Wenn_teilweise_nicht_aufloesbar_dann_Meldung_nennt_nur_die_betroffenen_Hashes()
    {
        var nichtAufloesbar = new CommitHashes(["deadbeefdeadbeef"]);
        var gesamteAuswahl = new CommitHashes(["aaaaaaaaaaaaaaaa", "deadbeefdeadbeef"]);

        var meldung = AufruffehlerMeldungen.AuswahlNichtAufloesbar(nichtAufloesbar, gesamteAuswahl);

        Assert.That(meldung, Does.Contain("deadbeefdeadbeef"));
        Assert.That(meldung, Does.Not.Contain("aaaaaaaaaaaaaaaa"));
        Assert.That(meldung, Does.Not.Contain("kein genannter Commit"));
        Assert.That(meldung, Does.Contain("auflösen"));
        Assert.That(meldung, Does.Contain("bitte"));
    }

    [Test]
    public void Wenn_alle_nicht_aufloesbar_dann_bleibt_der_bekannte_Satz_erlaubt()
    {
        var hashes = new CommitHashes(["deadbeefdeadbeef"]);

        var meldung = AufruffehlerMeldungen.AuswahlNichtAufloesbar(hashes, hashes);

        Assert.That(meldung, Does.Contain("kein genannter Commit"));
        Assert.That(meldung, Does.Contain("bitte"));
    }

    [Test]
    public void Wenn_mehr_als_fuenf_nicht_aufloesbar_dann_ist_die_Liste_gekuerzt()
    {
        var hashes = new CommitHashes(
        [
            "1111111111111111",
            "2222222222222222",
            "3333333333333333",
            "4444444444444444",
            "5555555555555555",
            "6666666666666666",
        ]);
        var gesamteAuswahl = new CommitHashes(
        [
            "1111111111111111",
            "2222222222222222",
            "3333333333333333",
            "4444444444444444",
            "5555555555555555",
            "6666666666666666",
            "aaaaaaaaaaaaaaaa",
            "bbbbbbbbbbbbbbbb",
        ]);

        var meldung = AufruffehlerMeldungen.AuswahlNichtAufloesbar(hashes, gesamteAuswahl);

        Assert.That(meldung, Does.Contain("1111111111111111"));
        Assert.That(meldung, Does.Contain("5555555555555555"));
        Assert.That(meldung, Does.Not.Contain("6666666666666666"));
        Assert.That(meldung, Does.Contain("und 1 weitere"));
    }
}
