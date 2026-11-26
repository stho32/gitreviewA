using GitReviewA.Aufruf;
using GitReviewA.Dateiansicht;
using GitReviewA.Git;
using GitReviewA.Protokoll;
using GitReviewA.Tests.Dateiansicht;

namespace GitReviewA.Tests.Dateiansicht;

/// <summary>
/// R00043 Kriterium 3: die ganze Tabelle der Startgründe gegen den <see cref="DateiansichtStartInteractor"/> — kein Beispiel,
/// jede Zeile. Dazu Kriterium 11 (U+FFFD), 16 (Rangfolge) und 18 (Ausnahme wird Grund, kein Absturz).
/// </summary>
[NonParallelizable]
public class DateiansichtStartInteractorTests
{
    [TestCase("fehlt.sql", (int)Quellengrundart.DateiNichtGefunden)]
    [TestCase("ordner", (int)Quellengrundart.IstEinVerzeichnis)]
    [TestCase("link.sql", (int)Quellengrundart.IstEinSymbolischerLink)]
    [TestCase("fifo.sql", (int)Quellengrundart.KeineRegulaereDatei)]
    [TestCase("/dev/zero", (int)Quellengrundart.KeineRegulaereDatei)]
    [TestCase("bin.dat", (int)Quellengrundart.Binaerdatei)]
    [TestCase("utf16.sql", (int)Quellengrundart.Utf16NichtUnterstuetzt)]
    [TestCase("latin1.sql", (int)Quellengrundart.UngueltigesUtf8)]
    [TestCase("fehlt\u202e\u200b\U000E0041.sql", (int)Quellengrundart.DateiNichtGefunden)]
    [TestCase("/proc/self/mem", (int)Quellengrundart.DateiNichtLesbar)]
    public void Wenn_die_Angabe_nicht_zeigbar_ist_dann_nennt_der_Start_genau_diesen_Grund(string angabe, int erwartet)
    {
        using var d = OrdnerD.Anlegen();

        var ausgang = InOrdner(d, () => Starte(angabe));

        Assert.That(ausgang.IstErfolg, Is.False);
        Assert.That(ausgang.Fehler, Has.Count.EqualTo(1));
        Assert.That((int)ausgang.Fehler[0].Grund.Art, Is.EqualTo(erwartet));
        Assert.That(ausgang.Stand, Is.Null);
    }

    [Test]
    public void Wenn_die_Rechte_fehlen_dann_nicht_lesbar()
    {
        if (Environment.UserName == "root")
        {
            Assert.Ignore("als root sind Rechte 000 lesbar");
        }
        using var d = OrdnerD.Anlegen();

        var ausgang = InOrdner(d, () => Starte("gesperrt.sql"));

        Assert.That(ausgang.Fehler[0].Grund.Art, Is.EqualTo(Quellengrundart.DateiNichtLesbar));
    }

    [Test]
    public void Wenn_die_Datei_grenze_sql_ist_dann_zeigbar_und_ueber_sql_zu_gross()
    {
        using var d = OrdnerD.Anlegen();
        var neun = new byte[8_388_608];
        Array.Fill(neun, (byte)'a');
        File.WriteAllBytes(d.Pfad("grenze.sql"), neun);
        File.WriteAllBytes(d.Pfad("ueber.sql"), [.. neun, (byte)'z']);

        var grenze = InOrdner(d, () => Starte("grenze.sql"));
        var ueber = InOrdner(d, () => Starte("ueber.sql"));

        Assert.That(grenze.IstErfolg, Is.True);
        Assert.That(ueber.Fehler[0].Grund.Art, Is.EqualTo(Quellengrundart.ZuGross));
    }

    [TestCase("unter/../a.sql")]
    [TestCase("ordnerlink/a.sql")]
    [TestCase("-x.sql")]
    [TestCase("zeile\numbruch.sql")]
    [TestCase("cr\r.sql")]
    public void Wenn_der_Pfad_ein_Umweg_oder_ein_sonderbarer_Name_ist_dann_zeigbar(string angabe)
    {
        using var d = OrdnerD.Anlegen();

        var ausgang = InOrdner(d, () => Starte(angabe));

        Assert.That(ausgang.IstErfolg, Is.True);
    }

    [Test]
    public void Wenn_der_Pfad_ueber_einen_Ordnerlink_geht_dann_nennt_der_eintrag_den_echten_Pfad()
    {
        using var d = OrdnerD.Anlegen();

        var ausgang = InOrdner(d, () => Starte("ordnerlink/a.sql"));

        Assert.That(ausgang.Stand?[0].EchterPfad, Is.EqualTo(d.Pfad("a.sql")));
        Assert.That(ausgang.Stand?[0].Anzeigename, Is.EqualTo("ordnerlink/a.sql"));
    }

    [Test]
    public void Wenn_a_sql_zeigbar_ist_dann_Nummer_0_mit_36_Bytes_3_Zeilen_UTF_8_LF()
    {
        using var d = OrdnerD.Anlegen();

        var ausgang = InOrdner(d, () => Starte("a.sql"));

        var eintrag = ausgang.Stand?[0] ?? throw new InvalidOperationException();
        Assert.That(eintrag.Nummer, Is.EqualTo(0));
        Assert.That(eintrag.Text.Groesse, Is.EqualTo(36));
        Assert.That(eintrag.Text.Zeilen, Is.EqualTo(3));
        Assert.That(eintrag.Text.Kodierungstext, Is.EqualTo("UTF-8"));
        Assert.That(eintrag.Text.Zeilenendetext, Is.EqualTo("LF"));
        Assert.That(eintrag.Text.Text, Is.EqualTo("SELECT 1;\n-- Kommentar\nSELECT 'ä';\n"));
    }

    [Test]
    public void Wenn_der_Name_ein_Ersatzzeichen_traegt_dann_abgelehnt_auch_wenn_die_Datei_so_heisst()
    {
        using var d = OrdnerD.Anlegen();

        var ausgang = InOrdner(d, () => Starte(d.Pfad("f\uFFFD.sql")));

        Assert.That(ausgang.Fehler[0].Grund.Art, Is.EqualTo(Quellengrundart.NameNichtUebergebbar));
        Assert.That(ausgang.Stand, Is.Null);
    }

    [Test]
    public void Wenn_der_Name_Marken_traegt_dann_bleibt_die_Angabe_im_Grund_roh_und_die_Meldung_zeigt_Marken()
    {
        using var d = OrdnerD.Anlegen();
        var angabe = "fehlt\u202e\u200b\U000E0041.sql";

        var ausgang = InOrdner(d, () => Starte(angabe));

        Assert.That(ausgang.Fehler[0].Angabe, Is.EqualTo(angabe));
    }

    [Test]
    public void Wenn_mehrere_Gruende_zugleich_gelten_dann_Art_vor_Groesse_vor_BOM_vor_Null_Byte_vor_UTF_8()
    {
        using var d = OrdnerD.Anlegen();
        var zuGross = new byte[8_388_609];
        zuGross[0] = 0xFF;
        zuGross[1] = 0xFE;
        zuGross[5] = 0x00;
        File.WriteAllBytes(d.Pfad("mehrere.sql"), zuGross);
        File.WriteAllBytes(d.Pfad("bomUndNull.sql"), [0xFF, 0xFE, 0x00, 0x41]);
        File.WriteAllBytes(d.Pfad("utf8BomUndNull.sql"), [0xEF, 0xBB, 0xBF, 0x00]);

        var mehrere = InOrdner(d, () => Starte("mehrere.sql"));
        var bomUndNull = InOrdner(d, () => Starte("bomUndNull.sql"));
        var utf8BomUndNull = InOrdner(d, () => Starte("utf8BomUndNull.sql"));

        Assert.That(mehrere.Fehler[0].Grund.Art, Is.EqualTo(Quellengrundart.ZuGross));
        Assert.That(bomUndNull.Fehler[0].Grund.Art, Is.EqualTo(Quellengrundart.Utf16NichtUnterstuetzt));
        Assert.That(utf8BomUndNull.Fehler[0].Grund.Art, Is.EqualTo(Quellengrundart.Binaerdatei));
    }

    [Test]
    public void Wenn_die_Datei_leer_ist_dann_zeigbar_mit_0_Zeilen()
    {
        using var d = OrdnerD.Anlegen();

        var ausgang = InOrdner(d, () => Starte("leer.sql"));

        Assert.That(ausgang.Stand?[0].Text.Text, Is.Empty);
        Assert.That(ausgang.Stand?[0].Text.Zeilen, Is.EqualTo(0));
    }

    [Test]
    public void Wenn_die_Datei_ohne_Repository_und_ohne_git_im_Suchpfad_liegt_dann_zeigbar()
    {
        using var d = OrdnerD.Anlegen();
        var pfadVorher = Environment.GetEnvironmentVariable("PATH");
        Environment.SetEnvironmentVariable("PATH", string.Empty);
        try
        {
            var ausgang = InOrdner(d, () => Starte("a.sql"));

            Assert.That(ausgang.IstErfolg, Is.True);
        }
        finally
        {
            Environment.SetEnvironmentVariable("PATH", pfadVorher);
        }
    }

    [Test]
    public void Wenn_eine_Datei_mit_LF_im_Namen_gezeigt_wird_dann_traegt_der_Anzeigename_die_Marke()
    {
        using var d = OrdnerD.Anlegen();

        var ausgang = InOrdner(d, () => Starte("zeile\numbruch.sql"));

        Assert.That(ausgang.Stand?[0].Anzeigename, Is.EqualTo("zeile⟨U+000A⟩umbruch.sql"));
    }

    [Test]
    public void Wenn_drei_Dateien_in_Aufrufreihenfolge_genannt_sind_dann_stehen_sie_so_mit_den_Nummern_0_bis_2()
    {
        using var d = OrdnerD.Anlegen();

        var ausgang = InOrdner(d, () => Starte("003.sql", "001.sql", "002.sql"));

        Assert.That(ausgang.IstErfolg, Is.True);
        var stand = ausgang.Stand ?? throw new InvalidOperationException();
        Assert.That(stand.Anzahl, Is.EqualTo(3));
        Assert.That(new[] { stand[0].Nummer, stand[1].Nummer, stand[2].Nummer }, Is.EqualTo(new[] { 0, 1, 2 }));
        Assert.That(new[] { stand[0].Anzeigename, stand[1].Anzeigename, stand[2].Anzeigename },
            Is.EqualTo(new[] { "003.sql", "001.sql", "002.sql" }));
    }

    [Test]
    public void Wenn_mehrere_Angaben_fehlerhaft_sind_dann_stehen_alle_Gruende_in_Aufrufreihenfolge()
    {
        using var d = OrdnerD.Anlegen();

        var ausgang = InOrdner(d, () => Starte("a.sql", "fehlt.sql", "ordner", "bin.dat"));

        Assert.That(ausgang.IstErfolg, Is.False);
        Assert.That(ausgang.Stand, Is.Null);
        Assert.That(ausgang.Fehler.Select(fehler => fehler.Angabe), Is.EqualTo(new[] { "fehlt.sql", "ordner", "bin.dat" }));
        Assert.That(ausgang.Fehler.Select(fehler => fehler.Grund.Art), Is.EqualTo(new[]
        {
            Quellengrundart.DateiNichtGefunden,
            Quellengrundart.IstEinVerzeichnis,
            Quellengrundart.Binaerdatei,
        }));
    }

    [Test]
    public void Wenn_dieselbe_Angabe_zweimal_und_ein_Umweg_genannt_sind_dann_steht_sie_einmal_der_Umweg_daneben()
    {
        using var d = OrdnerD.Anlegen();

        var ausgang = InOrdner(d, () => Starte("a.sql", "a.sql", "./a.sql"));

        Assert.That(ausgang.IstErfolg, Is.True);
        var stand = ausgang.Stand ?? throw new InvalidOperationException();
        Assert.That(stand.Anzahl, Is.EqualTo(2));
        Assert.That(stand[0].Anzeigename, Is.EqualTo("a.sql"));
        Assert.That(stand[1].Anzeigename, Is.EqualTo("./a.sql"));
        Assert.That(stand[0].EchterPfad, Is.EqualTo(stand[1].EchterPfad));
        Assert.That(stand[0].EchterPfad, Is.EqualTo(d.Pfad("a.sql")));
    }

    [Test]
    public void Wenn_51_Angaben_genannt_sind_dann_zu_viele_Dateien_ohne_eine_Datei_zu_oeffnen()
    {
        using var d = OrdnerD.Anlegen();
        var angaben = Enumerable.Range(0, 51).Select(nummer => $"kopie-{nummer}.sql").ToArray();

        var ausgang = InOrdner(d, () => Starte(angaben));

        Assert.That(ausgang.IstErfolg, Is.False);
        Assert.That(ausgang.Stand, Is.Null);
        Assert.That(ausgang.Grenzenmeldung, Is.EqualTo("zu viele Dateien (51, höchstens 50)"));
        Assert.That(ausgang.Fehler, Is.Empty);
    }

    [Test]
    public void Wenn_vier_Dateien_zu_je_8_MiB_und_eine_von_einem_Byte_genannt_sind_dann_zusammen_zu_gross()
    {
        using var d = OrdnerD.Anlegen();
        var acht = new byte[8_388_608];
        Array.Fill(acht, (byte)'a');
        for (var nummer = 0; nummer < 4; nummer++)
        {
            File.WriteAllBytes(d.Pfad($"gross-{nummer}.sql"), acht.ToArray());
        }
        File.WriteAllBytes(d.Pfad("eins.sql"), [(byte)'x']);

        var ausgang = InOrdner(d, () => Starte("gross-0.sql", "gross-1.sql", "gross-2.sql", "gross-3.sql", "eins.sql"));

        Assert.That(ausgang.IstErfolg, Is.False);
        Assert.That(ausgang.Fehler, Has.Count.EqualTo(1));
        Assert.That(ausgang.Fehler[0].Angabe, Is.EqualTo("eins.sql"));
        Assert.That(ausgang.Fehler[0].Grund.Art, Is.EqualTo(Quellengrundart.ZusammenZuGross));
    }

    [Test]
    public void Wenn_vier_Dateien_zu_je_8_MiB_genannt_sind_dann_genau_32_MiB_und_zeigbar()
    {
        using var d = OrdnerD.Anlegen();
        var acht = new byte[8_388_608];
        Array.Fill(acht, (byte)'a');
        for (var nummer = 0; nummer < 4; nummer++)
        {
            File.WriteAllBytes(d.Pfad($"genau-{nummer}.sql"), acht.ToArray());
        }

        var ausgang = InOrdner(d, () => Starte("genau-0.sql", "genau-1.sql", "genau-2.sql", "genau-3.sql"));

        Assert.That(ausgang.IstErfolg, Is.True);
        Assert.That(ausgang.Stand?.Anzahl, Is.EqualTo(4));
    }

    private static Startausgang Starte(params string[] angaben)
    {
        var buchung = new Quellenbuchung();
        var aufruf = new Dateiaufruf(angaben, 0, BrowserOeffnen: false, Protokollstufe.Warnung);
        return new DateiansichtStartInteractor(
            new DateiLeser(buchung),
            new GitCommitDateiquelle(Environment.CurrentDirectory, buchung),
            Ausgabegrenze.Standard).Starte(aufruf);
    }

    private static Startausgang InOrdner(OrdnerD d, Func<Startausgang> arbeit)
    {
        var vorher = Directory.GetCurrentDirectory();
        Directory.SetCurrentDirectory(d.Ordner);
        try
        {
            return arbeit();
        }
        finally
        {
            Directory.SetCurrentDirectory(vorher);
        }
    }
}