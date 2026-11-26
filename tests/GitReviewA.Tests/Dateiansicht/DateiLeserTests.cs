using System.Diagnostics;
using GitReviewA.Dateiansicht;
using GitReviewA.Git;

namespace GitReviewA.Tests.Dateiansicht;

/// <summary>R00043 Kriterium 3 (Tabelle Datenträger), Kriterien 12, 13, 16, 18 und die Buchung aus B4209 — am einzigen Leseort.</summary>
[NonParallelizable]
public class DateiLeserTests
{
    private static readonly Ausgabegrenze Grenze = Ausgabegrenze.Standard;

    [Test]
    public void Wenn_a_sql_gelesen_dann_genau_die_Bytes_und_der_echte_Pfad()
    {
        using var d = OrdnerD.Anlegen();
        var leser = Leser();

        var ergebnis = leser.Lies(d.Pfad("a.sql"), Grenze);

        Assert.That(ergebnis.IstGelesen, Is.True);
        var lesung = ergebnis.Lesung ?? throw new InvalidOperationException();
        Assert.That(lesung.Bytes, Is.EqualTo(File.ReadAllBytes(d.Pfad("a.sql"))));
        Assert.That(lesung.Bytes.Length, Is.EqualTo(36));
        Assert.That(lesung.EchterPfad, Is.EqualTo(d.Pfad("a.sql")));
    }

    [TestCase("unter/../a.sql")]
    [TestCase("ordnerlink/a.sql")]
    public void Wenn_der_Pfad_ueber_einen_Ordner_geht_dann_zeigt_der_echte_Pfad_das_Ziel(string angabe)
    {
        using var d = OrdnerD.Anlegen();
        var vorher = Directory.GetCurrentDirectory();
        Directory.SetCurrentDirectory(d.Ordner);
        try
        {
            var ergebnis = Leser().Lies(angabe, Grenze);

            Assert.That(ergebnis.IstGelesen, Is.True);
            Assert.That(ergebnis.Lesung?.EchterPfad, Is.EqualTo(d.Pfad("a.sql")));
        }
        finally
        {
            Directory.SetCurrentDirectory(vorher);
        }
    }

    [TestCase("fehlt.sql")]
    [TestCase("")]
    [TestCase("   ")]
    public void Wenn_die_Datei_fehlt_oder_die_Angabe_leer_ist_dann_nicht_gefunden(string angabe)
    {
        using var d = OrdnerD.Anlegen();

        var ergebnis = Leser().Lies(angabe, Grenze);

        Assert.That(ergebnis.Grund?.Art, Is.EqualTo(Quellengrundart.DateiNichtGefunden));
    }

    [Test]
    public void Wenn_der_Pfad_5000_Zeichen_hat_dann_nicht_gefunden_ohne_Ausnahme()
    {
        using var d = OrdnerD.Anlegen();
        var angabe = new string('a', 5000);

        var ergebnis = Leser().Lies(angabe, Grenze);

        Assert.That(ergebnis.Grund?.Art, Is.EqualTo(Quellengrundart.DateiNichtGefunden));
    }

    [TestCase("ordner")]
    [TestCase("unter")]
    [TestCase(".")]
    [TestCase("..")]
    [TestCase("/")]
    [TestCase("ordner/")]
    [TestCase("ordnerlink/")]
    public void Wenn_die_Angabe_ein_Verzeichnis_ist_dann_Verzeichnis(string angabe)
    {
        using var d = OrdnerD.Anlegen();
        var vorher = Directory.GetCurrentDirectory();
        Directory.SetCurrentDirectory(d.Ordner);
        try
        {
            var ergebnis = Leser().Lies(angabe, Grenze);

            Assert.That(ergebnis.Grund?.Art, Is.EqualTo(Quellengrundart.IstEinVerzeichnis));
        }
        finally
        {
            Directory.SetCurrentDirectory(vorher);
        }
    }

    [TestCase("link.sql")]
    [TestCase("kaputt.sql")]
    public void Wenn_der_letzte_Teil_ein_symbolischer_Link_ist_dann_abgelehnt(string angabe)
    {
        using var d = OrdnerD.Anlegen();
        var vorher = Directory.GetCurrentDirectory();
        Directory.SetCurrentDirectory(d.Ordner);
        try
        {
            var ergebnis = Leser().Lies(angabe, Grenze);

            Assert.That(ergebnis.Grund?.Art, Is.EqualTo(Quellengrundart.IstEinSymbolischerLink));
            Assert.That(ergebnis.Lesung, Is.Null);
        }
        finally
        {
            Directory.SetCurrentDirectory(vorher);
        }
    }

    [Test]
    public void Wenn_eine_FIFO_ohne_Schreiber_genannt_wird_dann_keine_regulaere_Datei_ohne_Haengen()
    {
        using var d = OrdnerD.Anlegen();
        var uhr = Stopwatch.StartNew();

        var ergebnis = LiesMitZeitgrenze(Leser(), d.Pfad("fifo.sql"));

        uhr.Stop();
        Assert.That(ergebnis.Grund?.Art, Is.EqualTo(Quellengrundart.KeineRegulaereDatei));
        Assert.That(uhr.ElapsedMilliseconds, Is.LessThanOrEqualTo(2000));
    }

    [TestCase("/dev/zero")]
    [TestCase("/dev/null")]
    [TestCase("/dev/random")]
    public void Wenn_ein_Geraet_genannt_wird_dann_keine_regulaere_Datei(string angabe)
    {
        var ergebnis = Leser().Lies(angabe, Grenze);

        Assert.That(ergebnis.Grund?.Art, Is.EqualTo(Quellengrundart.KeineRegulaereDatei));
    }

    [Test]
    public void Wenn_die_Rechte_fehlen_dann_nicht_lesbar()
    {
        if (Environment.UserName == "root")
        {
            Assert.Ignore("als root sind Rechte 000 lesbar");
        }
        using var d = OrdnerD.Anlegen();

        var ergebnis = Leser().Lies(d.Pfad("gesperrt.sql"), Grenze);

        Assert.That(ergebnis.Grund?.Art, Is.EqualTo(Quellengrundart.DateiNichtLesbar));
    }

    [Test]
    public void Wenn_die_Datei_genau_8_MiB_hat_dann_zeigbar_und_ein_Byte_mehr_ist_zu_gross()
    {
        using var d = OrdnerD.Anlegen();
        var neun = new byte[8_388_608];
        File.WriteAllBytes(d.Pfad("grenze.sql"), neun);
        File.WriteAllBytes(d.Pfad("ueber.sql"), [.. neun, (byte)'z']);

        var anDerGrenze = Leser().Lies(d.Pfad("grenze.sql"), Grenze);
        var ueber = Leser().Lies(d.Pfad("ueber.sql"), Grenze);

        Assert.That(anDerGrenze.IstGelesen, Is.True);
        Assert.That(ueber.Grund?.Art, Is.EqualTo(Quellengrundart.ZuGross));
    }

    [Test]
    public void Wenn_die_Einzelgrenze_klein_ist_dann_wird_nur_Grenze_plus_ein_Byte_gelesen()
    {
        using var d = OrdnerD.Anlegen();
        var buchung = new Quellenbuchung();
        var leser = new DateiLeser(buchung);

        var ergebnis = leser.Lies(d.Pfad("a.sql"), new Ausgabegrenze(10));

        Assert.That(ergebnis.Grund?.Art, Is.EqualTo(Quellengrundart.ZuGross));
        Assert.That(buchung.Gebucht, Is.EqualTo(11));
    }

    [Test]
    public void Wenn_die_Summe_ueberschritten_ist_dann_bricht_das_Lesen_ab()
    {
        using var d = OrdnerD.Anlegen();
        var buchung = new Quellenbuchung(hoechstsumme: 10);

        var ergebnis = new DateiLeser(buchung).Lies(d.Pfad("a.sql"), Grenze);

        Assert.That(ergebnis.Grund?.Art, Is.EqualTo(Quellengrundart.ZusammenZuGross));
        Assert.That(buchung.Gebucht, Is.GreaterThan(10));
        Assert.That(buchung.Gebucht, Is.LessThanOrEqualTo(11));
    }

    [Test]
    public void Wenn_die_Summe_genau_reicht_dann_wird_gelesen()
    {
        using var d = OrdnerD.Anlegen();
        var buchung = new Quellenbuchung(hoechstsumme: 36);

        var ergebnis = new DateiLeser(buchung).Lies(d.Pfad("a.sql"), Grenze);

        Assert.That(ergebnis.IstGelesen, Is.True);
        Assert.That(buchung.Gebucht, Is.EqualTo(36));
    }

    [Test]
    public void Wenn_der_Name_ein_Ersatzzeichen_traegt_dann_Name_nicht_uebergebbar_auch_wenn_die_Datei_so_heisst()
    {
        using var d = OrdnerD.Anlegen();

        var ergebnis = Leser().Lies(d.Pfad("f\uFFFD.sql"), Grenze);

        Assert.That(ergebnis.Grund?.Art, Is.EqualTo(Quellengrundart.NameNichtUebergebbar));
        Assert.That(ergebnis.Lesung, Is.Null);
    }

    [Test]
    public void Wenn_der_Ordnerlink_zwischen_Pruefung_und_Oeffnen_zeigt_dann_kommt_der_Pfad_aus_dem_geoeffneten_Handle()
    {
        using var d = OrdnerD.Anlegen();
        var zielEins = Path.Combine(d.Ordner, "ziel-eins");
        var zielZwei = Path.Combine(d.Ordner, "ziel-zwei");
        Directory.CreateDirectory(zielEins);
        Directory.CreateDirectory(zielZwei);
        File.WriteAllText(Path.Combine(zielEins, "wechsel.sql"), "INHALT-EINS\n");
        File.WriteAllText(Path.Combine(zielZwei, "wechsel.sql"), "INHALT-ZWEI\n");
        var link = Path.Combine(d.Ordner, "wechselordner");
        File.CreateSymbolicLink(link, zielEins);
        var haken = new DateiLeser(new Quellenbuchung(), _ =>
        {
            File.Delete(link);
            File.CreateSymbolicLink(link, zielZwei);
        });

        var ergebnis = haken.Lies(Path.Combine(link, "wechsel.sql"), Grenze);

        Assert.That(ergebnis.IstGelesen, Is.True);
        Assert.That(ergebnis.Lesung?.Bytes, Is.EqualTo(File.ReadAllBytes(Path.Combine(zielZwei, "wechsel.sql"))));
        Assert.That(ergebnis.Lesung?.EchterPfad, Is.EqualTo(Path.Combine(zielZwei, "wechsel.sql")));
    }

    [Test]
    public void Wenn_die_Datei_zwischen_Pruefung_und_Oeffnen_durch_einen_Link_ersetzt_wird_dann_abgelehnt_ohne_Zielinhalt()
    {
        using var d = OrdnerD.Anlegen();
        var haken = new DateiLeser(new Quellenbuchung(), angabe =>
        {
            File.Delete(angabe);
            File.CreateSymbolicLink(angabe, "/etc/hostname");
        });

        var ergebnis = haken.Lies(d.Pfad("haken.sql"), Grenze);

        Assert.That(ergebnis.Grund?.Art, Is.EqualTo(Quellengrundart.IstEinSymbolischerLink));
        Assert.That(ergebnis.Lesung, Is.Null);
    }

    [Test]
    public void Wenn_die_Datei_durch_eine_FIFO_ersetzt_wird_dann_abgelehnt_in_zwei_Sekunden()
    {
        using var d = OrdnerD.Anlegen();
        var uhr = Stopwatch.StartNew();
        var haken = new DateiLeser(new Quellenbuchung(), angabe =>
        {
            File.Delete(angabe);
            using var fifo = Process.Start("mkfifo", angabe);
            fifo?.WaitForExit();
        });

        var ergebnis = LiesMitZeitgrenze(haken, d.Pfad("haken.sql"));

        uhr.Stop();
        Assert.That(ergebnis.Grund?.Art, Is.EqualTo(Quellengrundart.KeineRegulaereDatei));
        Assert.That(uhr.ElapsedMilliseconds, Is.LessThanOrEqualTo(2000));
    }

    [Test]
    public void Wenn_die_Datei_durch_ein_Verzeichnis_ersetzt_wird_dann_abgelehnt()
    {
        using var d = OrdnerD.Anlegen();
        var haken = new DateiLeser(new Quellenbuchung(), angabe =>
        {
            File.Delete(angabe);
            Directory.CreateDirectory(angabe);
        });

        var ergebnis = haken.Lies(d.Pfad("haken.sql"), Grenze);

        Assert.That(ergebnis.Grund?.Art, Is.EqualTo(Quellengrundart.IstEinVerzeichnis));
    }

    [Test]
    public void Wenn_der_Lesepfad_bei_proc_self_mem_scheitert_dann_nicht_lesbar_ohne_Ausnahme()
    {
        var ergebnis = Leser().Lies("/proc/self/mem", Grenze);

        Assert.That(ergebnis.Grund?.Art, Is.EqualTo(Quellengrundart.DateiNichtLesbar));
    }

    [Test]
    public void Wenn_proc_self_maps_gelesen_wird_dann_zaehlt_die_gelesene_Groesse_nicht_die_des_Dateisystems()
    {
        var ergebnis = Leser().Lies("/proc/self/maps", Grenze);

        Assert.That(ergebnis.IstGelesen, Is.True);
        Assert.That(ergebnis.Lesung?.Bytes.Length, Is.GreaterThan(0));
    }

    private static DateiLeser Leser()
    {
        return new DateiLeser(new Quellenbuchung());
    }

    /// <summary>
    /// Liest mit harter Zeitgrenze: hängt das Öffnen oder Lesen (etwa weil eine FIFO blockiert), wird der Test rot, statt die
    /// ganze Suite zu blockieren — so wird ein Mutant sichtbar (R00043, P5/T2).
    /// </summary>
    private static Lesergebnis LiesMitZeitgrenze(DateiLeser leser, string angabe)
    {
        var aufgabe = Task.Run(() => leser.Lies(angabe, Grenze));
        var fertig = aufgabe.Wait(TimeSpan.FromSeconds(5));
        Assert.That(fertig, Is.True, $"Das Lesen von {angabe} hing länger als fünf Sekunden");
        return aufgabe.Result;
    }
}
