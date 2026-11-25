using System.Text;
using GitReviewA.Dateiansicht;

namespace GitReviewA.Tests.Dateiansicht;

/// <summary>
/// R00043 Kriterien 4 (Kopfwerte), 13 (Null-Byte an jeder Stelle), 14 (einzelnes CR) und 16 (Rangfolge, Zeilenzahl) sowie
/// die Unit-Tabellen I1–I9 der Angriffsmatrix — reine Einordnung, ohne Datei.
/// </summary>
public class InhaltseinordnungTests
{
    [Test]
    public void Wenn_a_sql_eingeordnet_wird_dann_36_Bytes_3_Zeilen_UTF_8_LF_und_Text_ohne_BOM()
    {
        using var d = OrdnerD.Anlegen();

        var ergebnis = Inhaltseinordnung.Ordne(File.ReadAllBytes(d.Pfad("a.sql")));

        Assert.That(ergebnis.IstEingeordnet, Is.True);
        var text = ergebnis.Text ?? throw new InvalidOperationException();
        Assert.That(text.Groesse, Is.EqualTo(36));
        Assert.That(text.Zeilen, Is.EqualTo(3));
        Assert.That(text.Kodierungstext, Is.EqualTo("UTF-8"));
        Assert.That(text.Zeilenendetext, Is.EqualTo("LF"));
        Assert.That(text.Text, Is.EqualTo(File.ReadAllText(d.Pfad("a.sql"))));
    }

    [Test]
    public void Wenn_crlf_eingeordnet_wird_dann_CRLF_und_der_Text_behaelt_CRLF()
    {
        using var d = OrdnerD.Anlegen();

        var text = Einordnung(File.ReadAllBytes(d.Pfad("crlf.sql")));

        Assert.That(text.Zeilenendetext, Is.EqualTo("CRLF"));
        Assert.That(text.Zeilen, Is.EqualTo(2));
        Assert.That(text.Text, Does.Contain("\r\n"));
    }

    [Test]
    public void Wenn_die_Datei_ohne_Schluss_LF_ist_dann_Zeilenende_keins_und_der_Text_bleibt_ohne()
    {
        using var d = OrdnerD.Anlegen();

        var text = Einordnung(File.ReadAllBytes(d.Pfad("ohne-ende.sql")));

        Assert.That(text.Zeilenendetext, Is.EqualTo("keins"));
        Assert.That(text.Zeilen, Is.EqualTo(1));
        Assert.That(text.Text, Is.EqualTo("SELECT 2;"));
    }

    [Test]
    public void Wenn_eine_UTF_8_BOM_da_ist_dann_wird_sie_nicht_gezeigt_und_der_Kopf_nennt_sie()
    {
        using var d = OrdnerD.Anlegen();

        var text = Einordnung(File.ReadAllBytes(d.Pfad("bom.sql")));

        Assert.That(text.Kodierungstext, Is.EqualTo("UTF-8 mit BOM"));
        Assert.That(text.Groesse, Is.EqualTo(13));
        Assert.That(text.Text, Is.EqualTo("SELECT 3;\n"));
    }

    [Test]
    public void Wenn_nur_eine_BOM_da_ist_dann_ist_die_Datei_leer()
    {
        var text = Einordnung([0xEF, 0xBB, 0xBF]);

        Assert.That(text.Text, Is.Empty);
        Assert.That(text.Zeilen, Is.EqualTo(0));
        Assert.That(text.Kodierungstext, Is.EqualTo("UTF-8 mit BOM"));
    }

    [Test]
    public void Wenn_die_Datei_leer_ist_dann_0_Zeilen()
    {
        using var d = OrdnerD.Anlegen();

        var text = Einordnung(File.ReadAllBytes(d.Pfad("leer.sql")));

        Assert.That(text.Text, Is.Empty);
        Assert.That(text.Zeilen, Is.EqualTo(0));
    }

    [TestCase(new byte[] { 0xFF, 0xFE, 0x53, 0x00 })]
    [TestCase(new byte[] { 0xFE, 0xFF, 0x00, 0x53 })]
    [TestCase(new byte[] { 0xFF, 0xFE, 0x00, 0x00, 0x53, 0x00 })]
    [TestCase(new byte[] { 0x00, 0x00, 0xFE, 0xFF, 0x00, 0x00, 0x00, 0x53 })]
    public void Wenn_eine_UTF_16_oder_UTF_32_BOM_da_ist_dann_UTF_16_wird_nicht_unterstuetzt(byte[] bytes)
    {
        var ergebnis = Inhaltseinordnung.Ordne(bytes);

        Assert.That(ergebnis.Grund?.Art, Is.EqualTo(Quellengrundart.Utf16NichtUnterstuetzt));
    }

    [Test]
    public void Wenn_UTF_16_BOM_und_Null_Byte_zugleich_da_sind_dann_gilt_der_BOM_Grund()
    {
        var bytes = new byte[16];
        bytes[0] = 0xFF;
        bytes[1] = 0xFE;
        bytes[5] = 0x00;

        var ergebnis = Inhaltseinordnung.Ordne(bytes);

        Assert.That(ergebnis.Grund?.Art, Is.EqualTo(Quellengrundart.Utf16NichtUnterstuetzt));
    }

    [TestCase(0)]
    [TestCase(7999)]
    [TestCase(8000)]
    [TestCase(1024 * 1024)]
    public void Wenn_ein_Null_Byte_an_jeder_Stelle_steht_dann_Binaerdatei(int stelle)
    {
        var bytes = new byte[1024 * 1024 + 1];
        Array.Fill(bytes, (byte)'a');
        bytes[stelle] = 0;

        var ergebnis = Inhaltseinordnung.Ordne(bytes);

        Assert.That(ergebnis.Grund?.Art, Is.EqualTo(Quellengrundart.Binaerdatei));
    }

    [Test]
    public void Wenn_das_Null_Byte_an_der_letzten_Stelle_steht_dann_Binaerdatei()
    {
        var bytes = new byte[9000];
        Array.Fill(bytes, (byte)'a');
        bytes[^1] = 0;

        var ergebnis = Inhaltseinordnung.Ordne(bytes);

        Assert.That(ergebnis.Grund?.Art, Is.EqualTo(Quellengrundart.Binaerdatei));
    }

    [Test]
    public void Wenn_UTF_8_BOM_und_Null_Byte_da_sind_dann_bleibt_es_Binaerdatei()
    {
        var bytes = new byte[] { 0xEF, 0xBB, 0xBF, (byte)'a', 0x00 };

        var ergebnis = Inhaltseinordnung.Ordne(bytes);

        Assert.That(ergebnis.Grund?.Art, Is.EqualTo(Quellengrundart.Binaerdatei));
    }

    [Test]
    public void Wenn_latin1_gelesen_wird_dann_Byte_E9_an_Stelle_12()
    {
        using var d = OrdnerD.Anlegen();

        var ergebnis = Inhaltseinordnung.Ordne(File.ReadAllBytes(d.Pfad("latin1.sql")));

        Assert.That(ergebnis.Grund, Is.EqualTo(Quellengrund.UngueltigesUtf8(0xE9, 12)));
    }

    [TestCase(new byte[] { 0xC0, 0xAF }, 0xC0, 1)]
    [TestCase(new byte[] { 0xED, 0xA0, 0x80 }, 0xED, 1)]
    [TestCase(new byte[] { 0xF4, 0x90, 0x80, 0x80 }, 0xF4, 1)]
    [TestCase(new byte[] { 0xE2, 0x82 }, 0xE2, 1)]
    [TestCase(new byte[] { 0x80 }, 0x80, 1)]
    [TestCase(new byte[] { 0xFE, 0x41 }, 0xFE, 1)]
    [TestCase(new byte[] { (byte)'a', 0xFF }, 0xFF, 2)]
    public void Wenn_die_UTF_8_Folge_ungueltig_ist_dann_Byte_und_Stelle(byte[] bytes, byte ungueltig, int stelle)
    {
        var ergebnis = Inhaltseinordnung.Ordne(bytes);

        Assert.That(ergebnis.Grund, Is.EqualTo(Quellengrund.UngueltigesUtf8(ungueltig, stelle)));
    }

    [Test]
    public void Wenn_die_Stelle_mit_BOM_gezaehlt_wird_dann_ab_Dateianfang()
    {
        var bytes = new byte[] { 0xEF, 0xBB, 0xBF, (byte)'a', 0xE9 };

        var ergebnis = Inhaltseinordnung.Ordne(bytes);

        Assert.That(ergebnis.Grund, Is.EqualTo(Quellengrund.UngueltigesUtf8(0xE9, 5)));
    }

    [TestCase(new byte[] { 0xEF, 0xBF, 0xBD })]
    [TestCase(new byte[] { 0xEF, 0xBF, 0xBF })]
    [TestCase(new byte[] { 0xF4, 0x8F, 0xBF, 0xBF })]
    [TestCase(new byte[] { 0xF0, 0x9F, 0x98, 0x80 })]
    [TestCase(new byte[] { 0xC2, 0xA0 })]
    [TestCase(new byte[] { 0xE3, 0x85, 0xA4 })]
    [TestCase(new byte[] { 0xE2, 0xA0, 0x80 })]
    public void Wenn_gueltiges_UTF_8_sonderbar_aussieht_dann_ist_es_zeigbar(byte[] bytes)
    {
        var ergebnis = Inhaltseinordnung.Ordne(bytes);

        Assert.That(ergebnis.IstEingeordnet, Is.True);
    }

    [Test]
    public void Wenn_ein_einzelnes_CR_im_Text_steht_dann_ist_es_kein_Zeilenende()
    {
        var bytes = Encoding.UTF8.GetBytes("-- harmlos\rDROP TABLE x;");

        var text = Einordnung(bytes);

        Assert.That(text.Zeilenendetext, Is.EqualTo("keins"));
        Assert.That(text.Zeilen, Is.EqualTo(1));
        Assert.That(text.Text, Does.Contain("\r"));
    }

    [TestCase("a\n", 1)]
    [TestCase("a\nb", 2)]
    [TestCase("a\nb\n", 2)]
    [TestCase("\n", 1)]
    [TestCase("\n\n", 2)]
    [TestCase("a\r\nb\r\n", 2)]
    [TestCase("a\rb", 1)]
    public void Wenn_Zeilenenden_und_Rest_so_stehen_dann_gilt_eine_Zeilenzahl(string inhalt, int zeilen)
    {
        var text = Einordnung(Encoding.UTF8.GetBytes(inhalt));

        Assert.That(text.Zeilen, Is.EqualTo(zeilen));
    }

    [TestCase("a\nb\r\nc", "gemischt")]
    [TestCase("a\nb\n", "LF")]
    [TestCase("a\r\nb\r\n", "CRLF")]
    [TestCase("a\rb", "keins")]
    [TestCase("a\r", "keins")]
    public void Wenn_LF_und_CRLF_gemischt_sind_dann_nennt_der_Kopf_gemischt(string inhalt, string erwartet)
    {
        var text = Einordnung(Encoding.UTF8.GetBytes(inhalt));

        Assert.That(text.Zeilenendetext, Is.EqualTo(erwartet));
    }

    [TestCase("\u2028")]
    [TestCase("\u2029")]
    [TestCase("\u0085")]
    [TestCase("\u000B")]
    [TestCase("\u000C")]
    public void Wenn_andere_Trenner_im_Text_sind_dann_sind_sie_kein_Zeilenende(string trenner)
    {
        var text = Einordnung(Encoding.UTF8.GetBytes($"a{trenner}b"));

        Assert.That(text.Zeilen, Is.EqualTo(1));
        Assert.That(text.Zeilenendetext, Is.EqualTo("keins"));
    }

    private static Dateitext Einordnung(byte[] bytes)
    {
        var ergebnis = Inhaltseinordnung.Ordne(bytes);
        Assert.That(ergebnis.IstEingeordnet, Is.True, ergebnis.Grund?.Art.ToString());
        return ergebnis.Text ?? throw new InvalidOperationException();
    }
}