using GitReviewA.Fremdtext;
using GitReviewA.Git;
using GitReviewA.Sprung;

namespace GitReviewA.Tests.Sprung;

/// <summary>
/// B2001: `Sprungpfad` bildet aus einer Datei des Commits und der Repositorywurzel den absoluten Pfad — rein und ohne git.
/// Kein Sprung bei Status `D`, bei Rohbytes oder unsichtbaren Zeichen im neuen oder alten Namen und wenn der Pfad die Wurzel
/// verlässt. Ebene: Unit (Eingabe rein, Ergebnis prüfen).
/// </summary>
public class SprungpfadTests
{
    private const string Wurzel = "/repo-wurzel";

    [Test]
    public void Wenn_ein_gueltiger_Name_dann_absoluter_Pfad_in_der_Wurzel()
    {
        var datei = new Dateiaenderung("M", "src/a.txt", null, 1, 1);

        var ergebnis = Sprungpfad.Bilde(datei, Wurzel);

        Assert.That(ergebnis, Is.EqualTo(new Sprungpfadergebnis(Sprungablehnung.Keine, "/repo-wurzel/src/a.txt")));
    }

    [TestCase("Ordner mit Leerzeichen/datei#1.txt", "/repo-wurzel/Ordner mit Leerzeichen/datei#1.txt")]
    [TestCase("prozent%25.txt", "/repo-wurzel/prozent%25.txt")]
    [TestCase("tief/tief/tief.txt", "/repo-wurzel/tief/tief/tief.txt")]
    public void Wenn_der_Name_Leerzeichen_Rauteck_oder_Prozent_traegt_dann_derselbe_absolute_Pfad(string name, string erwartet)
    {
        var datei = new Dateiaenderung("A", name, null, 1, 0);

        var ergebnis = Sprungpfad.Bilde(datei, Wurzel);

        Assert.That(ergebnis, Is.EqualTo(new Sprungpfadergebnis(Sprungablehnung.Keine, erwartet)));
    }

    [Test]
    public void Wenn_der_Name_ein_Betriebssystemtrennzeichen_als_Tab_traegt_dann_gueltig()
    {
        var datei = new Dateiaenderung("A", "a\tb.txt", null, 1, 0);

        var ergebnis = Sprungpfad.Bilde(datei, Wurzel);

        Assert.That(ergebnis.Ablehnung, Is.EqualTo(Sprungablehnung.Keine));
    }

    [Test]
    public void Wenn_der_Name_Rohbytes_traegt_dann_nicht_uebergebbar()
    {
        var datei = new Dateiaenderung("A", "f⟨0xFF⟩.txt", null, 1, 0, new Rohname([0x66, 0xFF, 0x2E, 0x74, 0x78, 0x74]));

        var ergebnis = Sprungpfad.Bilde(datei, Wurzel);

        Assert.That(ergebnis, Is.EqualTo(new Sprungpfadergebnis(Sprungablehnung.NameNichtUebergebbar, null)));
    }

    [TestCase("\u202E")]
    [TestCase("\u200B")]
    [TestCase("\uFEFF")]
    [TestCase("\U000E0041")]
    [TestCase("\u2028")]
    [TestCase("\n")]
    [TestCase("\r")]
    [TestCase("\u0007")]
    public void Wenn_der_Name_ein_unsichtbares_Zeichen_traegt_dann_nicht_uebergebbar(string unsichtbar)
    {
        var datei = new Dateiaenderung("A", $"x{unsichtbar}y.txt", null, 1, 0);

        var ergebnis = Sprungpfad.Bilde(datei, Wurzel);

        Assert.That(ergebnis, Is.EqualTo(new Sprungpfadergebnis(Sprungablehnung.NameNichtUebergebbar, null)));
    }

    [TestCase("../README.md")]
    [TestCase("a/../b.txt")]
    [TestCase("/etc/hostname")]
    public void Wenn_der_Pfad_die_Wurzel_verlaesst_dann_kein_Sprung(string name)
    {
        var datei = new Dateiaenderung("M", name, null, 1, 1);

        var ergebnis = Sprungpfad.Bilde(datei, Wurzel);

        Assert.That(ergebnis, Is.EqualTo(new Sprungpfadergebnis(Sprungablehnung.PfadVerlaesstRepository, null)));
    }

    [Test]
    public void Wenn_der_Status_geloescht_ist_dann_kein_Sprung()
    {
        var datei = new Dateiaenderung("D", "README.md", null, 0, 2);

        var ergebnis = Sprungpfad.Bilde(datei, Wurzel);

        Assert.That(ergebnis, Is.EqualTo(new Sprungpfadergebnis(Sprungablehnung.StatusGeloescht, null)));
    }

    [Test]
    public void Wenn_eine_Umbenennung_den_alten_Namen_mit_Rohbytes_traegt_dann_nicht_uebergebbar()
    {
        var datei = new Dateiaenderung("R", "x.txt", "o⟨0xFF⟩.txt", 1, 0, null, new Rohname([0x6F, 0xFF, 0x2E, 0x74, 0x78, 0x74]));

        var ergebnis = Sprungpfad.Bilde(datei, Wurzel);

        Assert.That(ergebnis, Is.EqualTo(new Sprungpfadergebnis(Sprungablehnung.NameNichtUebergebbar, null)));
    }

    [Test]
    public void Wenn_eine_Umbenennung_den_alten_Namen_mit_U202E_traegt_dann_nicht_uebergebbar()
    {
        var datei = new Dateiaenderung("R", "x.txt", "a\u202Eb.txt", 1, 1);

        var ergebnis = Sprungpfad.Bilde(datei, Wurzel);

        Assert.That(ergebnis, Is.EqualTo(new Sprungpfadergebnis(Sprungablehnung.NameNichtUebergebbar, null)));
    }

    [Test]
    public void Wenn_eine_Umbenennung_gueltig_ist_dann_der_neue_Pfad()
    {
        var datei = new Dateiaenderung("R", "neu.txt", "alt.txt", 1, 1);

        var ergebnis = Sprungpfad.Bilde(datei, Wurzel);

        Assert.That(ergebnis, Is.EqualTo(new Sprungpfadergebnis(Sprungablehnung.Keine, "/repo-wurzel/neu.txt")));
    }
}
