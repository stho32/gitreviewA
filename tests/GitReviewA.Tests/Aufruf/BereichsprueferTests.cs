using GitReviewA.Aufruf;

namespace GitReviewA.Tests.Aufruf;

public class BereichsprueferTests
{
    [TestCase("b2c3..e5f6")]
    [TestCase("main..feature")]
    [TestCase("HEAD~5..")]
    [TestCase("..feature")]
    [TestCase("HEAD~2..HEAD")]
    [TestCase("v1.2.3..release/2026-11")]
    [TestCase("HEAD^..HEAD")]
    [TestCase("HEAD~..HEAD^2~3")]
    [TestCase("HEAD~123456..HEAD")]
    [TestCase("feature_x..ABCDEF0123")]
    [TestCase("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef..HEAD")]
    public void Wenn_Bereich_aus_zulaessigen_Endpunkten_dann_zulaessig(string bereich)
    {
        var istZulaessig = Bereichspruefer.IstZulaessigerBereich(bereich);

        Assert.That(istZulaessig, Is.True);
    }

    [TestCase("abcd...ef01", Description = "symmetrische Differenz")]
    [TestCase("--output=pwn..HEAD")]
    [TestCase("HEAD..--output=pwn")]
    [TestCase("HEAD@{1}..HEAD")]
    [TestCase("main^{/x}..HEAD")]
    [TestCase("HEAD:f..HEAD")]
    [TestCase("a..b..c")]
    [TestCase("..")]
    [TestCase("-x..HEAD")]
    [TestCase("HEAD..-x")]
    [TestCase("HEAD; touch pwn..HEAD")]
    [TestCase("HEAD~1234567..HEAD", Description = "mehr als 6 Ziffern")]
    [TestCase("HEAD^-1..HEAD")]
    [TestCase("HEAD^!..HEAD")]
    [TestCase(":/text..HEAD")]
    [TestCase("main..feature ")]
    [TestCase("main\t..feature")]
    [TestCase("main..fea\nture")]
    [TestCase("main..feat\u0000ure")]
    [TestCase("main..f*")]
    [TestCase("main..f?")]
    [TestCase("main..f[1]")]
    [TestCase("main..f\\x")]
    [TestCase("main..$(id)")]
    [TestCase("main..`id`")]
    [TestCase("main..ma'in")]
    [TestCase("main..mäin")]
    [TestCase("abcd")]
    [TestCase("HEAD")]
    [TestCase("")]
    [TestCase("main..~1")]
    public void Wenn_Bereich_unzulaessig_dann_abgewiesen(string bereich)
    {
        var istZulaessig = Bereichspruefer.IstZulaessigerBereich(bereich);

        Assert.That(istZulaessig, Is.False);
    }
}
