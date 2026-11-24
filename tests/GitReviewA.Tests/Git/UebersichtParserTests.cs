using GitReviewA.Aufruf;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Git;

/// <summary>Ausgabe von <c>git log --format=%x1e%H --raw --numstat -z</c> mit mehreren Commits (Format geprobt mit git 2.48).</summary>
public class UebersichtParserTests
{
    private const string HashP = "13ba46c707f0744779fe7c52c3e935814b908017";
    private const string HashQ = "dd13577c75a05e64a0aa01cb6e9053d7548c83d0";
    private const string HashR = "aeea185479334dd4aa96ad61d8956604685154b1";
    private const string Ohne = "0000000000000000000000000000000000000000";
    private const string Blob = "1191247b6d9a206f6ba3d8ac79e26d041dd86941";

    [Test]
    public void Wenn_leerer_Commit_zwischen_zwei_Commits_mit_Dateien_dann_Stellen_je_Commit_in_Reihenfolge()
    {
        var ausgabe = Kopf(HashQ) + "\n" + Roh("A") + "neu.txt\0" + Roh("R100") + "README.md\0LIESMICH.md\0" + "1\t0\tneu.txt\0" + "0\t0\t\0README.md\0LIESMICH.md\0"
            + Kopf(HashR)
            + Kopf(HashP) + "\n" + Roh("A") + "a.txt\0" + "1\t0\ta.txt\0";

        var stellen = UebersichtParser.Parse(ausgabe, new CommitHashes([HashQ, HashR, HashP])).AlsArray();

        Assert.That(stellen, Is.EqualTo(new[] { new Stelle(HashQ, "neu.txt"), new Stelle(HashQ, "LIESMICH.md"), new Stelle(HashP, "a.txt") }));
    }

    [Test]
    public void Wenn_der_letzte_Commit_leer_ist_dann_keine_Stelle_fuer_ihn_und_der_Commit_ist_bekannt()
    {
        var ausgabe = Kopf(HashP) + "\n" + Roh("A") + "a.txt\0" + "1\t0\ta.txt\0" + Kopf(HashR);

        var uebersicht = UebersichtParser.Parse(ausgabe, new CommitHashes([HashP, HashR]));

        Assert.That(uebersicht.AlsArray(), Is.EqualTo(new[] { new Stelle(HashP, "a.txt") }));
        Assert.That(uebersicht.EnthaeltCommit(HashR), Is.True);
    }

    [Test]
    public void Wenn_ein_Pfad_wie_ein_Kopf_oder_ein_Rohdatensatz_aussieht_dann_bleibt_er_Pfad()
    {
        var falscherKopf = "\u001e" + HashR;
        var ausgabe = Kopf(HashP) + "\n" + Roh("A") + falscherKopf + "\0" + Roh("A") + ":x\0" + $"1\t0\t{falscherKopf}\0" + "1\t0\t:x\0";

        var stellen = UebersichtParser.Parse(ausgabe, new CommitHashes([HashP])).AlsArray();

        Assert.That(stellen, Is.EqualTo(new[] { new Stelle(HashP, falscherKopf), new Stelle(HashP, ":x") }));
    }

    [TestCase(HashQ + "," + HashP, "Kopf in anderer Reihenfolge")]
    [TestCase(HashP, "Commit fehlt in der Ausgabe")]
    public void Wenn_die_Koepfe_nicht_der_Auswahl_entsprechen_dann_GitFehler_mit_dem_erwarteten_Hash(string koepfe, string fall)
    {
        var ausgabe = string.Concat(koepfe.Split(',').Select(Kopf));

        var fehler = Assert.Throws<GitFehler>(() => UebersichtParser.Parse(ausgabe, new CommitHashes([HashP, HashQ])));

        Assert.That(fehler.Message, Does.Contain(HashP[..7]).Or.Contain(HashQ[..7]), fall);
    }

    [Test]
    public void Wenn_nach_dem_letzten_Commit_noch_Teile_folgen_dann_GitFehler()
    {
        var ausgabe = Kopf(HashP) + "rest\0";

        Assert.Throws<GitFehler>(() => UebersichtParser.Parse(ausgabe, new CommitHashes([HashP])));
    }

    private static string Kopf(string hash)
    {
        return "\u001e" + hash + "\0";
    }

    private static string Roh(string status)
    {
        return $":000000 100644 {Ohne} {Blob} {status}\0";
    }
}
