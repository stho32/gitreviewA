using System.Text.Json;
using GitReviewA.Anmerkungen;

namespace GitReviewA.Tests.Anmerkungen;

/// <summary>
/// R00036 „Art der Anmerkung“, Kriterium 4 (Werte und Ablehnung) und die Grenzen der NFA: `muss`, `frage`, `idee` oder keine Art;
/// andere Schreibung, leerer String, Zahl und ein Text von 10 000 Zeichen sind „Art unbekannt“. Wort, Präfix und Protokollwert
/// kommen aus derselben Stelle.
/// </summary>
public class AnmerkungsartTests
{
    [TestCase("muss", "Muss", "[Muss]")]
    [TestCase("frage", "Frage", "[Frage]")]
    [TestCase("idee", "Idee", "[Idee]")]
    public void Wenn_einer_der_drei_Werte_dann_gueltig_mit_Wort_und_Praefix(string wert, string wort, string praefix)
    {
        var ergebnis = Anmerkungsart.Pruefe(wert);
        var art = ergebnis.Angabe.Wert;

        Assert.That(ergebnis.IstGueltig, Is.True);
        Assert.That(ergebnis.Angabe.IstAngegeben, Is.True);
        Assert.That(art, Is.Not.Null);
        Assert.That(Anmerkungsart.Wort(art), Is.EqualTo(wort));
        Assert.That(Anmerkungsart.Praefix(art), Is.EqualTo(praefix));
        Assert.That(Anmerkungsart.Wert(art), Is.EqualTo(wert));
        Assert.That(Anmerkungsart.Protokollwert(art), Is.EqualTo(wert));
    }

    [Test]
    public void Wenn_alle_drei_Werte_gelesen_dann_sind_sie_verschieden()
    {
        var arten = new[] { "muss", "frage", "idee" }.Select(wert => Anmerkungsart.Pruefe(wert).Angabe.Wert).ToArray();

        Assert.That(arten, Is.Unique);
        Assert.That(arten, Is.EquivalentTo(Enum.GetValues<Art>().Cast<Art?>()));
    }

    [Test]
    public void Wenn_keine_Art_dann_gueltig_ohne_Wert_Wort_und_Praefix()
    {
        var ergebnis = Anmerkungsart.Pruefe(null);

        Assert.That(ergebnis.IstGueltig, Is.True);
        Assert.That(ergebnis.Angabe.Wert, Is.Null);
        Assert.That(Anmerkungsart.Wort(null), Is.Null);
        Assert.That(Anmerkungsart.Praefix(null), Is.Null);
        Assert.That(Anmerkungsart.Protokollwert(null), Is.EqualTo("ohne"));
    }

    [TestCase("MUSS")]
    [TestCase("Frage")]
    [TestCase("muss ")]
    [TestCase(" muss")]
    [TestCase("muss\n")]
    [TestCase("")]
    [TestCase("   ")]
    [TestCase("Muss")]
    [TestCase("muss, frage")]
    public void Wenn_andere_Schreibung_oder_leer_dann_Art_unbekannt(string wert)
    {
        var ergebnis = Anmerkungsart.Pruefe(wert);

        Assert.That(ergebnis.IstGueltig, Is.False);
        Assert.That(ergebnis.Grund, Is.EqualTo("Art unbekannt"));
    }

    [Test]
    public void Wenn_Text_von_10000_Zeichen_dann_Art_unbekannt()
    {
        var ergebnis = Anmerkungsart.Pruefe(new string('m', 10_000));

        Assert.That((ergebnis.IstGueltig, ergebnis.Grund), Is.EqualTo((false, "Art unbekannt")));
    }

    [Test]
    public void Wenn_das_Praefix_mit_Leerzeichen_gemessen_dann_hoechstens_8_Zeichen()
    {
        var laengen = Enum.GetValues<Art>().Select(art => Anmerkungsart.Praefix(art)!.Length + 1);

        Assert.That(laengen.Max(), Is.LessThanOrEqualTo(8));
    }

    [Test]
    public void Wenn_das_Feld_fehlt_dann_gueltig_und_nicht_angegeben()
    {
        var ergebnis = Anmerkungsart.Lies(null);

        Assert.That(ergebnis.IstGueltig, Is.True);
        Assert.That(ergebnis.Angabe.IstAngegeben, Is.False);
    }

    [Test]
    public void Wenn_das_Feld_ausdruecklich_null_dann_gueltig_ausdruecklich_ohne()
    {
        var ergebnis = Anmerkungsart.Lies(JsonSerializer.SerializeToElement<string?>(null));

        Assert.That((ergebnis.IstGueltig, ergebnis.Angabe.IstAngegeben, ergebnis.Angabe.Wert), Is.EqualTo((true, true, (Art?)null)));
    }

    [Test]
    public void Wenn_das_Feld_eine_Zeichenkette_muss_dann_gueltig_mit_der_Art()
    {
        var ergebnis = Anmerkungsart.Lies(JsonSerializer.SerializeToElement("muss"));

        Assert.That((ergebnis.IstGueltig, ergebnis.Angabe.Wert, ergebnis.Angabe.IstAngegeben), Is.EqualTo((true, (Art?)Art.Muss, true)));
    }

    [TestCase("7")]
    [TestCase("1.5")]
    [TestCase("true")]
    [TestCase("{}")]
    [TestCase("[]")]
    [TestCase("\"MUSS\"")]
    public void Wenn_das_Feld_keine_Zeichenkette_der_drei_Werte_dann_Art_unbekannt(string json)
    {
        using var dokument = JsonDocument.Parse(json);

        var ergebnis = Anmerkungsart.Lies(dokument.RootElement);

        Assert.That((ergebnis.IstGueltig, ergebnis.Grund), Is.EqualTo((false, "Art unbekannt")));
    }
}