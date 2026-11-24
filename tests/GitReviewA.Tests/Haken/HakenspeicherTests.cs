using GitReviewA.Haken;

namespace GitReviewA.Tests.Haken;

public class HakenspeicherTests
{
    private static readonly Stelle BInQ = new("dd13577c75a05e64a0aa01cb6e9053d7548c83d0", "src/b.txt");
    private static readonly Stelle BInP = new("13ba46c707f0744779fe7c52c3e935814b908017", "src/b.txt");

    [Test]
    public void Wenn_eine_Stelle_abgehakt_dann_ist_genau_diese_Stelle_abgehakt()
    {
        var speicher = new Hakenspeicher();

        var angenommen = speicher.VersucheZuSetzen(BInQ, abgehakt: true);
        var haken = speicher.Schnappschuss();

        Assert.That(angenommen, Is.True);
        Assert.That((haken.Anzahl, haken.IstAbgehakt(BInQ), haken.IstAbgehakt(BInP)), Is.EqualTo((1, true, false)));
    }

    [Test]
    public void Wenn_dieselbe_Stelle_zweimal_abgehakt_dann_zaehlt_sie_einmal()
    {
        var speicher = new Hakenspeicher();

        speicher.VersucheZuSetzen(BInQ, abgehakt: true);
        speicher.VersucheZuSetzen(BInQ, abgehakt: true);

        Assert.That(speicher.Schnappschuss().Anzahl, Is.EqualTo(1));
    }

    [Test]
    public void Wenn_ein_Haken_entnommen_dann_ist_die_Stelle_nicht_mehr_abgehakt_und_ein_zweites_Entnehmen_aendert_nichts()
    {
        var speicher = new Hakenspeicher();
        speicher.VersucheZuSetzen(BInQ, abgehakt: true);
        speicher.VersucheZuSetzen(BInP, abgehakt: true);

        speicher.VersucheZuSetzen(BInQ, abgehakt: false);
        speicher.VersucheZuSetzen(BInQ, abgehakt: false);
        var haken = speicher.Schnappschuss();

        Assert.That((haken.Anzahl, haken.IstAbgehakt(BInQ), haken.IstAbgehakt(BInP)), Is.EqualTo((1, false, true)));
    }

    [Test]
    public void Wenn_ohne_Haken_entnommen_dann_bleibt_der_Speicher_leer()
    {
        var speicher = new Hakenspeicher();

        var angenommen = speicher.VersucheZuSetzen(BInP, abgehakt: false);

        Assert.That((angenommen, speicher.Schnappschuss().Anzahl), Is.EqualTo((true, 0)));
    }

    [Test]
    public void Wenn_gesiegelt_dann_wird_jeder_weitere_Haken_abgelehnt_und_der_Stand_bleibt()
    {
        var speicher = new Hakenspeicher();
        speicher.VersucheZuSetzen(BInP, abgehakt: true);

        var ersterSiegel = speicher.VersucheZuSiegeln();
        var zweiterSiegel = speicher.VersucheZuSiegeln();
        var setzenNachSiegel = speicher.VersucheZuSetzen(BInQ, abgehakt: true);
        var entnehmenNachSiegel = speicher.VersucheZuSetzen(BInP, abgehakt: false);
        var haken = speicher.Schnappschuss();

        Assert.That((ersterSiegel, zweiterSiegel, setzenNachSiegel, entnehmenNachSiegel), Is.EqualTo((true, false, false, false)));
        Assert.That((haken.Anzahl, haken.IstAbgehakt(BInP), haken.IstAbgehakt(BInQ)), Is.EqualTo((1, true, false)));
    }

    [Test]
    public void Wenn_ein_Schnappschuss_genommen_und_danach_gesetzt_dann_bleibt_der_Schnappschuss_unveraendert()
    {
        var speicher = new Hakenspeicher();
        var vorher = speicher.Schnappschuss();

        speicher.VersucheZuSetzen(BInP, abgehakt: true);

        Assert.That((vorher.Anzahl, vorher.IstAbgehakt(BInP)), Is.EqualTo((0, false)));
    }

    [Test]
    public void Wenn_1000_Stellen_parallel_gesetzt_und_dabei_gesiegelt_dann_steht_im_Schnappschuss_genau_was_angenommen_wurde()
    {
        var speicher = new Hakenspeicher();
        var stellen = Enumerable.Range(0, 1000).Select(nummer => new Stelle(BInP.Commit, $"datei-{nummer}.txt")).ToArray();
        var angenommen = new bool[stellen.Length];

        Parallel.For(0, stellen.Length, nummer =>
        {
            angenommen[nummer] = speicher.VersucheZuSetzen(stellen[nummer], abgehakt: true);
            if (nummer == 500)
            {
                speicher.VersucheZuSiegeln();
            }
        });
        var haken = speicher.Schnappschuss();

        var angenommeneStellen = stellen.Where((_, nummer) => angenommen[nummer]).ToArray();
        Assert.That(haken.Anzahl, Is.EqualTo(angenommeneStellen.Length));
        Assert.That(angenommeneStellen.All(haken.IstAbgehakt), Is.True);
        Assert.That(speicher.VersucheZuSetzen(stellen[0], abgehakt: false), Is.False);
    }
}
