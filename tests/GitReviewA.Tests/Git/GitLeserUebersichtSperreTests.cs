using System.Runtime.Versioning;
using GitReviewA.Aufruf;
using GitReviewA.Git;
using GitReviewA.Tests.Akzeptanz;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Git;

/// <summary>
/// R00014, B1301: die Übersicht trägt je Stelle den Sperrgrund aus derselben Regel wie der Diff-Ausgang (`Namenspruefung`), gelesen aus
/// der einen Übersicht, ohne weiteren git-Aufruf.
/// </summary>
[Platform(Exclude = "Win", Reason = "Namen aus ungültigem UTF-8 gibt es nur unter Linux")]
[UnsupportedOSPlatform("windows")]
public class GitLeserUebersichtSperreTests
{
    private const string NichtEindeutig = "Diff nicht lesbar: Name nicht eindeutig";
    private const string NichtUebergebbar = "Diff nicht lesbar: Name nicht übergebbar";

    [Test]
    public void Wenn_Repo_N_mit_v_gelesen_dann_das_Paar_und_der_Name_mit_Zeilenumbruch_gesperrt_und_f_FF_in_v_lesbar()
    {
        using var repo = FremdeNamenRepo.NMitV();

        var uebersicht = GitLeser.UebersichtLesen(new CommitHashes([repo.Hash("n"), repo.Hash("v")]), repo.Ordner);

        var gruende = new List<string>();
        foreach (var stelle in uebersicht)
        {
            gruende.Add($"{stelle.Pfad}|{uebersicht.SperrgrundVon(stelle)}");
        }
        Assert.That(gruende, Is.EqualTo(new[]
        {
            "a⟨0xFF⟩.sh|", "b⟨0xFF⟩.bin|", "f⟨0xFF⟩.txt|" + NichtEindeutig, "f⟨0xFF⟩.txt|" + NichtEindeutig, "g.txt|", "in.txt|",
            "r⟨0xFF⟩.txt|", "t⟨0xFE⟩.txt|", FremdeNamenRepo.NameMitZeilenumbruchUndFF + "|" + NichtUebergebbar, "f⟨0xFF⟩.txt|",
        }));
    }

    [Test]
    public void Wenn_der_alte_Name_einer_Umbenennung_Zeilenumbruch_und_Byte_traegt_dann_ist_die_Stelle_unter_dem_lesbaren_neuen_Namen_gesperrt()
    {
        using var repo = FremdeNamenRepo.N();
        repo.CommitAnlegen("s", FremdeNamenRepo.SkriptAlterNameNichtUebergebbar);
        repo.CommitAnlegen("u", FremdeNamenRepo.SkriptUmbenennungAufLesbarenNamen);

        var uebersicht = GitLeser.UebersichtLesen(new CommitHashes([repo.Hash("u")]), repo.Ordner);

        var stelle = uebersicht.AlsArray().Single();
        Assert.That((stelle.Pfad, uebersicht.SperrgrundVon(stelle)), Is.EqualTo(("u.txt", NichtUebergebbar)));
    }
}
