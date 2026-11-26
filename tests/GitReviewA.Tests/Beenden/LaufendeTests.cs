using GitReviewA.Beenden;

namespace GitReviewA.Tests.Beenden;

/// <summary>
/// B4603: der eine Einmal-Schalter für „Beenden“ und „Abbrechen“ (R00050). Wer zuerst angenommen ist, gewinnt; ein zweiter
/// Versuch derselben Art ist kein neuer Stopp, ein Versuch der anderen Art wird mit dem geltenden Zustand abgelehnt.
/// </summary>
public class LaufendeTests
{
    [Test]
    public void Wenn_nichts_entschieden_ist_dann_gewinnt_der_erste_Abbruch()
    {
        var laufende = new Laufende();

        var versuch = laufende.Versuche(Laufentscheidung.Abbruch);

        Assert.That(versuch.Angenommen, Is.True);
        Assert.That(versuch.Zustand, Is.EqualTo(Laufentscheidung.Abbruch));
        Assert.That(laufende.Zustand, Is.EqualTo(Laufentscheidung.Abbruch));
    }

    [Test]
    public void Wenn_Beenden_zuerst_angenommen_ist_dann_ist_Abbruch_abgelehnt_und_Beenden_bleibt()
    {
        var laufende = new Laufende();
        Assert.That(laufende.Versuche(Laufentscheidung.Beenden).Angenommen, Is.True);

        var versuch = laufende.Versuche(Laufentscheidung.Abbruch);

        Assert.That(versuch.Angenommen, Is.False);
        Assert.That(versuch.Zustand, Is.EqualTo(Laufentscheidung.Beenden));
        Assert.That(laufende.Zustand, Is.EqualTo(Laufentscheidung.Beenden));
    }

    [Test]
    public void Wenn_Abbruch_zuerst_angenommen_ist_dann_ist_Beenden_abgelehnt_und_Abbruch_bleibt()
    {
        var laufende = new Laufende();
        Assert.That(laufende.Versuche(Laufentscheidung.Abbruch).Angenommen, Is.True);

        var versuch = laufende.Versuche(Laufentscheidung.Beenden);

        Assert.That(versuch.Angenommen, Is.False);
        Assert.That(versuch.Zustand, Is.EqualTo(Laufentscheidung.Abbruch));
        Assert.That(laufende.Zustand, Is.EqualTo(Laufentscheidung.Abbruch));
    }

    [Test]
    public void Wenn_zweimal_dieselbe_Art_kommt_dann_ist_nur_der_erste_angenommen()
    {
        var laufende = new Laufende();

        var erster = laufende.Versuche(Laufentscheidung.Abbruch);
        var zweiter = laufende.Versuche(Laufentscheidung.Abbruch);

        Assert.That((erster.Angenommen, zweiter.Angenommen), Is.EqualTo((true, false)));
        Assert.That(zweiter.Zustand, Is.EqualTo(Laufentscheidung.Abbruch));
    }

    [Test]
    public void Wenn_gleichzeitig_Beenden_und_Abbruch_kommen_dann_gewinnt_genau_einer()
    {
        for (var lauf = 0; lauf < 50; lauf++)
        {
            var laufende = new Laufende();
            var start = new Barrier(2);

            var beenden = Task.Run(() =>
            {
                start.SignalAndWait();
                return laufende.Versuche(Laufentscheidung.Beenden);
            });
            var abbrechen = Task.Run(() =>
            {
                start.SignalAndWait();
                return laufende.Versuche(Laufentscheidung.Abbruch);
            });
            Task.WaitAll(beenden, abbrechen);

            Assert.That(beenden.Result.Angenommen ^ abbrechen.Result.Angenommen, Is.True, $"Lauf {lauf}");
            Assert.That(laufende.Zustand, Is.EqualTo(beenden.Result.Angenommen ? Laufentscheidung.Beenden : Laufentscheidung.Abbruch));
        }
    }
}