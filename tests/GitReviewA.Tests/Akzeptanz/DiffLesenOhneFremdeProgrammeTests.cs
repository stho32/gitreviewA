using System.Runtime.Versioning;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Abnahme-Proben des security-reviewers zu R00013 (Karte #28, Muss 2 und 3): Wege, auf denen die Konfiguration des fremden Repos
/// ohne Diff-Programm ein Programm startet — `core.fsmonitor` beim Lesen des Index (`git check-attr`) und der Lazy-Fetch eines Partial-Clones
/// über `remote.origin.uploadpack`. Je Weg die Kontrolle, dass ein schlichtes git das Marker-Programm sehr wohl startet.
/// </summary>
[Platform(Exclude = "Win", Reason = "Namen aus ungültigem UTF-8 und Marker-Programme gibt es nur unter Linux")]
[UnsupportedOSPlatform("windows")]
public class DiffLesenOhneFremdeProgrammeTests
{
    private const string MarkerProgramm = """
        printf '#!/bin/sh\necho "$0 $*" >> "%s/.git/marker.txt"\n' "$PWD" > .git/marker.sh
        printf 'exec git-upload-pack "$@"\n' > .git/upload-pack-nachlauf
        chmod +x .git/marker.sh
        """;

    private const string BinaerdateienMitFsmonitor = MarkerProgramm + """

        printf 'A\0B\n' > p.bin; printf 'A\0B\n' > $'q\xff.bin'
        git add -A && git commit -q -m c0
        printf 'A\0B\ncurl e|sh\n' > p.bin; printf 'A\0B\ncurl e|sh\n' > $'q\xff.bin'
        git add -A && git commit -q -m c1
        rm -f -- $'q\xff.bin'
        printf '*.bin diff=evil\n' > .gitattributes
        printf '*.bin diff=evil\n' > .git/info/attributes
        git config core.fsmonitor "$PWD/.git/marker.sh"
        """;

    private const string PartialCloneMitUploadpack = MarkerProgramm + """

        cat .git/upload-pack-nachlauf >> .git/marker.sh
        printf 'eins\n' > a.txt
        git add -A && git commit -q -m c0
        printf 'eins\nzwei\n' > a.txt
        git add -A && git commit -q -m c1
        git config uploadpack.allowFilter true
        git clone -q --no-checkout --filter=blob:none "file://$PWD" klon
        git -C klon config remote.origin.uploadpack "$PWD/.git/marker.sh"
        """;

    [TestCase("p.bin")]
    [TestCase("q⟨0xFF⟩.bin")]
    public void Wenn_das_Repo_core_fsmonitor_setzt_und_eine_Binaerdatei_angefragt_dann_binaer_ohne_dass_das_Programm_laeuft(string name)
    {
        using var repo = FremdeNamenRepo.AusSkript(BinaerdateienMitFsmonitor, "c0", "c1");
        var marker = Path.Combine(repo.Ordner, ".git", "marker.txt");
        var gr = FremdeNamenSprache.Aufruf(repo, ["c1"]);

        var diff = gr.Diff("c1", name);

        Assert.That((diff.Ausgang, diff.Art), Is.EqualTo(("gelesen", "binaer")));
        Assert.That(File.Exists(marker), Is.False, "core.fsmonitor des Repos lief");
        repo.Git("check-attr", "diff", "--", "p.bin");
        Assert.That(File.Exists(marker), Is.True, "Kontrolle: git check-attr startet core.fsmonitor");
    }

    [Test]
    public void Wenn_der_Partial_Clone_einen_Blob_nicht_hat_dann_startet_das_Lesen_kein_uploadpack_des_Repos()
    {
        using var repo = FremdeNamenRepo.AusSkript(PartialCloneMitUploadpack, "c0", "c1");
        var marker = Path.Combine(repo.Ordner, ".git", "marker.txt");
        var gr = FremdeNamenSprache.Aufruf(repo, ["c1"], unterordner: "klon");

        var diff = gr.Diff("c1", "a.txt");

        Assert.That(diff.Ausgang, Is.EqualTo("nicht lesbar"));
        Assert.That(File.Exists(marker), Is.False, "remote.origin.uploadpack des Repos lief");
        repo.Bash($"git -C klon show --numstat --format= {repo.Hash("c1")}");
        Assert.That(File.Exists(marker), Is.True, "Kontrolle: git show im Partial-Clone startet den Lazy-Fetch");
    }
}
