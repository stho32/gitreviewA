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
        foreach (var grund in AlleGruende)
        {
            Assert.That(AufruffehlerMeldungen.ExitCode(grund), Is.EqualTo(2), $"Grund {grund}");
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
}
