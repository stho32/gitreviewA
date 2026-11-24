using GitReviewA.Haken;

namespace GitReviewA.Tests.Haken;

public class GemerkteUebersichtTests
{
    private const string Hash = "13ba46c707f0744779fe7c52c3e935814b908017";
    private static readonly TimeSpan Frist = TimeSpan.FromSeconds(5);

    [Test]
    public void Wenn_die_erste_Lesung_noch_laeuft_dann_liefert_das_Ergebnis_sofort_die_leere_Uebersicht()
    {
        using var quelle = new HaengendeUebersichtsquelle();
        var gemerkt = new GemerkteUebersicht(quelle);
        var ersteLesung = Task.Run(gemerkt.Lesen);
        var lesungHatBegonnen = quelle.Begonnen.Wait(Frist);

        var fuerDasErgebnis = Task.Run(gemerkt.GemerktOderLeer);
        var ergebnisOhneWarten = fuerDasErgebnis.Wait(Frist);
        quelle.Freigeben();

        Assert.That(lesungHatBegonnen, Is.True, "Kontrolle: die erste Lesung hängt in git");
        Assert.That(ergebnisOhneWarten, Is.True, "das Ergebnis wartet nicht auf git");
        Assert.That(fuerDasErgebnis.Result.Anzahl, Is.EqualTo(0));
        Assert.That(ersteLesung.Wait(Frist), Is.True);
        Assert.That(gemerkt.GemerktOderLeer().Anzahl, Is.EqualTo(1), "nach der Lesung gilt die gemerkte Übersicht");
    }

    private sealed class HaengendeUebersichtsquelle : IUebersichtsquelle, IDisposable
    {
        private readonly ManualResetEventSlim freigabe = new();

        public ManualResetEventSlim Begonnen { get; } = new();

        public Dateiuebersicht Lesen()
        {
            Begonnen.Set();
            freigabe.Wait(Frist);
            return new Dateiuebersicht([Hash], [new Stelle(Hash, "a.txt")]);
        }

        public void Freigeben()
        {
            freigabe.Set();
        }

        public void Dispose()
        {
            freigabe.Dispose();
            Begonnen.Dispose();
        }
    }
}
