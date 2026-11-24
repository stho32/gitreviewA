using GitReviewA.Server;
using Microsoft.Extensions.Primitives;

namespace GitReviewA.Tests.Server;

public class AnfrageschutzTests
{
    private const int Port = 5123;
    private const string Json = "application/json";

    [TestCase(null)]
    [TestCase("http://127.0.0.1:5123")]
    public void Wenn_POST_mit_JSON_und_ohne_oder_mit_eigenem_Origin_dann_zugelassen(string? origin)
    {
        var urteil = Anfrageschutz.Beurteile("POST", new StringValues(origin), Json, Port);

        Assert.That(urteil, Is.EqualTo(Schutzurteil.Zugelassen));
    }

    [TestCase("http://evil.example")]
    [TestCase("null")]
    [TestCase("")]
    [TestCase("http://localhost:5123")]
    [TestCase("http://127.0.0.1:5124")]
    [TestCase("http://127.0.0.1")]
    [TestCase("https://127.0.0.1:5123")]
    [TestCase("http://127.0.0.1:5123/")]
    [TestCase("http://127.0.0.1:51234")]
    [TestCase("http://127.0.0.1:5123.evil.example")]
    [TestCase("HTTP://127.0.0.1:5123")]
    [TestCase(" http://127.0.0.1:5123")]
    [TestCase("http://[::1]:5123")]
    public void Wenn_Origin_nicht_genau_die_eigene_Adresse_dann_403(string origin)
    {
        var urteil = Anfrageschutz.Beurteile("POST", origin, Json, Port);

        Assert.That((urteil.IstZugelassen, urteil.Statuscode), Is.EqualTo((false, 403)));
        Assert.That(urteil.Meldung, Is.Not.Empty);
    }

    [Test]
    public void Wenn_zwei_Origin_Koepfe_auch_mit_eigenem_dann_403()
    {
        var urteil = Anfrageschutz.Beurteile("POST", new StringValues(["http://127.0.0.1:5123", "http://evil.example"]), Json, Port);

        Assert.That(urteil.Statuscode, Is.EqualTo(403));
    }

    [TestCase("GET")]
    [TestCase("HEAD")]
    [TestCase("PUT")]
    [TestCase("DELETE")]
    [TestCase("OPTIONS")]
    [TestCase("post")]
    public void Wenn_nicht_POST_dann_405(string methode)
    {
        var urteil = Anfrageschutz.Beurteile(methode, StringValues.Empty, Json, Port);

        Assert.That((urteil.IstZugelassen, urteil.Statuscode), Is.EqualTo((false, 405)));
    }

    [TestCase("application/json; charset=utf-8")]
    [TestCase("application/json;charset=UTF-8")]
    [TestCase("Application/JSON")]
    public void Wenn_Inhaltstyp_JSON_mit_oder_ohne_UTF8_dann_zugelassen(string inhaltstyp)
    {
        var urteil = Anfrageschutz.Beurteile("POST", StringValues.Empty, inhaltstyp, Port);

        Assert.That(urteil.IstZugelassen, Is.True);
    }

    [TestCase(null)]
    [TestCase("")]
    [TestCase("text/plain")]
    [TestCase("application/x-www-form-urlencoded")]
    [TestCase("multipart/form-data; boundary=x")]
    [TestCase("application/jsonp")]
    [TestCase("application/json+x")]
    [TestCase("application/x-json")]
    [TestCase("application/ld+json")]
    [TestCase("text/json")]
    [TestCase("application/json; charset=latin1")]
    [TestCase("application/json; x=1")]
    [TestCase("application/json, text/plain")]
    [TestCase("text/plain; application/json")]
    public void Wenn_Inhaltstyp_nicht_genau_JSON_dann_415(string? inhaltstyp)
    {
        var urteil = Anfrageschutz.Beurteile("POST", StringValues.Empty, new StringValues(inhaltstyp), Port);

        Assert.That((urteil.IstZugelassen, urteil.Statuscode), Is.EqualTo((false, 415)));
    }

    [Test]
    public void Wenn_zwei_Inhaltstyp_Koepfe_dann_415()
    {
        var urteil = Anfrageschutz.Beurteile("POST", StringValues.Empty, new StringValues([Json, "text/plain"]), Port);

        Assert.That(urteil.Statuscode, Is.EqualTo(415));
    }

    [Test]
    public void Wenn_fremder_Origin_und_GET_ohne_Inhaltstyp_dann_zuerst_403()
    {
        var urteil = Anfrageschutz.Beurteile("GET", "http://evil.example", StringValues.Empty, Port);

        Assert.That(urteil.Statuscode, Is.EqualTo(403));
    }
}
