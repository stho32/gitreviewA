using GitReviewA.Server;

namespace GitReviewA.Tests.Server;

public class HostPruefungTests
{
    [Test]
    public void Wenn_Host_genau_die_Adresse_des_Laufs_dann_erlaubt()
    {
        var erlaubt = HostPruefung.IstErlaubt("127.0.0.1:5123", 5123);

        Assert.That(erlaubt, Is.True);
    }

    [TestCase("fremd.example")]
    [TestCase("fremd.example:5123")]
    [TestCase("localhost:5123")]
    [TestCase("127.0.0.1")]
    [TestCase("127.0.0.1:5124")]
    [TestCase("127.0.0.1:51234")]
    [TestCase("127.0.0.1:5123.fremd.example")]
    [TestCase("x127.0.0.1:5123")]
    [TestCase(" 127.0.0.1:5123")]
    [TestCase("127.0.0.1:5123 ")]
    [TestCase("[::1]:5123")]
    [TestCase("")]
    [TestCase(null)]
    public void Wenn_Host_nicht_genau_die_Adresse_des_Laufs_dann_abgewiesen(string? host)
    {
        var erlaubt = HostPruefung.IstErlaubt(host, 5123);

        Assert.That(erlaubt, Is.False);
    }
}
