using GitReviewA.Browser;

namespace GitReviewA.Tests.Browser;

public class BrowserStartTests
{
    private const string Adresse = "http://127.0.0.1:5123/";

    [Test]
    public void Wenn_eigener_Browser_gesetzt_dann_dieser_Befehl_mit_der_Adresse_als_einzigem_Argument()
    {
        var start = BrowserStart.Fuer(Adresse, "/opt/mein browser", Plattform.Linux);

        Assert.That(start.FileName, Is.EqualTo("/opt/mein browser"));
        Assert.That(start.ArgumentList, Is.EqualTo(new[] { Adresse }));
        Assert.That(start.UseShellExecute, Is.False);
    }

    [Test]
    public void Wenn_Linux_ohne_eigenen_Browser_dann_xdg_open()
    {
        var start = BrowserStart.Fuer(Adresse, null, Plattform.Linux);

        Assert.That(start.FileName, Is.EqualTo("xdg-open"));
        Assert.That(start.ArgumentList, Is.EqualTo(new[] { Adresse }));
        Assert.That(start.RedirectStandardOutput, Is.True);
    }

    [Test]
    public void Wenn_macOS_ohne_eigenen_Browser_dann_open()
    {
        var start = BrowserStart.Fuer(Adresse, "", Plattform.MacOS);

        Assert.That(start.FileName, Is.EqualTo("open"));
        Assert.That(start.ArgumentList, Is.EqualTo(new[] { Adresse }));
    }

    [Test]
    public void Wenn_Windows_ohne_eigenen_Browser_dann_Adresse_ueber_die_Shell()
    {
        var start = BrowserStart.Fuer(Adresse, null, Plattform.Windows);

        Assert.That(start.FileName, Is.EqualTo(Adresse));
        Assert.That(start.UseShellExecute, Is.True);
        Assert.That(start.ArgumentList, Is.Empty);
    }
}
