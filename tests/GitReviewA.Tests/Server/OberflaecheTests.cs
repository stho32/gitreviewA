using System.Text;
using GitReviewA.Server;

namespace GitReviewA.Tests.Server;

public class OberflaecheTests
{
    [Test]
    public void Wenn_Startseite_gesucht_dann_eingebettete_index_html_mit_Commit_Liste()
    {
        var oberflaeche = Oberflaeche.AusDemProgramm();

        var gefunden = oberflaeche.VersucheZuFinden("index.html", out var datei);

        Assert.That(gefunden, Is.True);
        Assert.That(datei?.Inhaltstyp, Does.StartWith("text/html"));
        Assert.That(datei, Is.Not.Null);
        Assert.That(Encoding.UTF8.GetString(datei!.Inhalt), Does.Contain("id=\"commit-liste\""));
    }

    [TestCase("commits.js", "text/javascript")]
    [TestCase("seitenleiste-meldung.js", "text/javascript")]
    [TestCase("kd-tokens.css", "text/css")]
    [TestCase("kd-base.css", "text/css")]
    [TestCase("gitreviewa.css", "text/css")]
    [TestCase("fonts/ibm-plex-sans-latin-400-normal.woff2", "font/woff2")]
    [TestCase("faerben.js", "text/javascript")]
    [TestCase("vendor/prism.js", "text/javascript")]
    [TestCase("vendor/LICENSE-prism.txt", "text/plain; charset=utf-8")]
    public void Wenn_Datei_der_Oberflaeche_gesucht_dann_mit_Inhalt_und_Inhaltstyp(string pfad, string inhaltstyp)
    {
        var oberflaeche = Oberflaeche.AusDemProgramm();

        var gefunden = oberflaeche.VersucheZuFinden(pfad, out var datei);

        Assert.That(gefunden, Is.True);
        Assert.That(datei?.Inhaltstyp, Is.EqualTo(inhaltstyp));
        Assert.That(datei?.Inhalt, Is.Not.Empty);
    }

    [TestCase("gibt-es-nicht.js")]
    [TestCase("../gitreviewA.dll")]
    [TestCase("fonts/LICENSE-OFL.txt")]
    [TestCase("")]
    public void Wenn_Pfad_keine_Datei_der_Oberflaeche_dann_nicht_gefunden(string pfad)
    {
        var oberflaeche = Oberflaeche.AusDemProgramm();

        var gefunden = oberflaeche.VersucheZuFinden(pfad, out _);

        Assert.That(gefunden, Is.False);
    }

    [Test]
    public void Wenn_Prism_ausgeliefert_dann_mit_Version_Lizenz_und_Lizenztext()
    {
        var oberflaeche = Oberflaeche.AusDemProgramm();

        oberflaeche.VersucheZuFinden("vendor/prism.js", out var prism);
        oberflaeche.VersucheZuFinden("vendor/LICENSE-prism.txt", out var lizenz);

        var kopfkommentar = Encoding.UTF8.GetString(prism!.Inhalt).Split('\n')[0];
        Assert.That(kopfkommentar, Does.Contain("prismjs 1.30.0"));
        Assert.That(Encoding.UTF8.GetString(prism.Inhalt), Does.Contain("Lizenz: MIT"));
        Assert.That(Encoding.UTF8.GetString(lizenz!.Inhalt), Does.StartWith("MIT LICENSE"));
    }

    [Test]
    public void Wenn_Startseite_gelesen_dann_ohne_Prism_und_ohne_Inline_Skript()
    {
        var oberflaeche = Oberflaeche.AusDemProgramm();

        oberflaeche.VersucheZuFinden("index.html", out var startseite);

        var html = Encoding.UTF8.GetString(startseite!.Inhalt);
        Assert.That(html, Does.Not.Contain("prism").IgnoreCase);
        Assert.That(html, Does.Not.Contain("faerben.js"));
        Assert.That(html, Does.Not.Match("<script(?![^>]*\\bsrc=)"));
    }

    [Test]
    public void Wenn_Ausgabeordner_durchsucht_dann_keine_losen_Dateien_der_Oberflaeche()
    {
        var ausgabeordner = Path.GetDirectoryName(typeof(Oberflaeche).Assembly.Location)!;

        var loseDateien = Directory.EnumerateFiles(ausgabeordner, "*", SearchOption.AllDirectories)
            .Where(IstDateiDerOberflaeche)
            .ToList();

        Assert.That(File.Exists(Path.Combine(ausgabeordner, "gitreviewA.dll")), Is.True);
        Assert.That(loseDateien, Is.Empty);
    }

    private static bool IstDateiDerOberflaeche(string datei)
    {
        string[] endungenDerOberflaeche = [".html", ".js", ".css", ".woff2"];
        return endungenDerOberflaeche.Contains(Path.GetExtension(datei), StringComparer.OrdinalIgnoreCase);
    }
}
