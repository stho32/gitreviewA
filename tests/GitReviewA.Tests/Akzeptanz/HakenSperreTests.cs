using System.Runtime.Versioning;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Spezifikation R00014 „Haken und Anmerkung bei nicht lesbarem Diff sperren“, Kriterien 1–7 gegen die Interactors mit echtem git in Repo N
/// plus Commit `v` (Kriterium 1 ist die Abnahme-Probe des product-owner). Die Anzeige (Kriterium 8) prüft <c>e2e/tests/haken-sperre.spec.js</c>.
/// </summary>
[Platform(Exclude = "Win", Reason = "Namen aus ungültigem UTF-8 gibt es nur unter Linux")]
[UnsupportedOSPlatform("windows")]
public class HakenSperreTests
{
    private const string NichtEindeutig = "Diff nicht lesbar: Name nicht eindeutig";
    private const string NichtUebergebbar = "Diff nicht lesbar: Name nicht übergebbar";
    private const string Paar = "f⟨0xFF⟩.txt";
    private const string MitZeilenumbruch = FremdeNamenRepo.NameMitZeilenumbruchUndFF;

    [Test]
    [Description("R00014 Kriterium 1")]
    public void Wenn_beim_Paar_oder_beim_Namen_mit_Zeilenumbruch_abgehakt_werden_soll_dann_abgelehnt_mit_Grund_und_lesbare_Stellen_abhakbar()
    {
        using var repo = FremdeNamenRepo.NMitV();
        var gr = HakenSperreSprache.Aufruf(repo, "n", "v");

        var paar = gr.Hake("n", Paar);
        var zeilenumbruch = gr.Hake("n", MitZeilenumbruch);
        var nachDenAblehnungen = gr.Fortschritt();
        var a = gr.Hake("n", "a⟨0xFF⟩.sh");
        var nachA = gr.Fortschritt();
        var inV = gr.Hake("v", Paar);
        var nachV = gr.Fortschritt();
        var paarEntnehmen = gr.NimmHakenWeg("n", Paar);
        var zeilenumbruchEntnehmen = gr.NimmHakenWeg("n", MitZeilenumbruch);

        Assert.That((paar.Ausgang, paar.Grund), Is.EqualTo(("ungültig", NichtEindeutig)));
        Assert.That((zeilenumbruch.Ausgang, zeilenumbruch.Grund), Is.EqualTo(("ungültig", NichtUebergebbar)));
        Assert.That(nachDenAblehnungen, Is.EqualTo("0 von 10 abgehakt"));
        Assert.That((a.Ausgang, nachA), Is.EqualTo(("gesetzt", "1 von 10 abgehakt")));
        Assert.That((inV.Ausgang, nachV), Is.EqualTo(("gesetzt", "2 von 10 abgehakt")));
        Assert.That((paarEntnehmen.Ausgang, paarEntnehmen.Grund), Is.EqualTo(("ungültig", NichtEindeutig)));
        Assert.That((zeilenumbruchEntnehmen.Ausgang, zeilenumbruchEntnehmen.Grund), Is.EqualTo(("ungültig", NichtUebergebbar)));
        Assert.That(gr.Fortschritt(), Is.EqualTo("2 von 10 abgehakt"));
    }

    [Test]
    [Description("R00014 Kriterium 1")]
    public void Wenn_eine_gesperrte_Stelle_abgelehnt_wird_dann_nennt_weder_Grund_noch_Protokoll_den_Namen()
    {
        using var repo = FremdeNamenRepo.NMitV();
        var gr = HakenSperreSprache.Aufruf(repo, "n", "v");

        gr.Hake("n", Paar);
        gr.Hake("n", MitZeilenumbruch);

        var ablehnungen = gr.Protokollzeilen().Where(IstAbgelehnterHaken).ToArray();
        Assert.That(ablehnungen, Has.Length.EqualTo(2));
        Assert.That(ablehnungen[0], Does.EndWith("abgelehnt: " + NichtEindeutig));
        Assert.That(ablehnungen[1], Does.EndWith("abgelehnt: " + NichtUebergebbar));
        Assert.That(gr.Protokollzeilen(), Has.None.Contains("f⟨0xFF⟩").And.None.Contains("z⟨U+000A⟩"));
    }

    [Test]
    [Description("R00014 Kriterium 2")]
    public void Wenn_nichts_abgehakt_und_der_Stand_gelesen_dann_10_Stellen_n_vor_v_davon_genau_drei_mit_Sperrgrund()
    {
        using var repo = FremdeNamenRepo.NMitV();
        var gr = HakenSperreSprache.Aufruf(repo, "n", "v");

        var stellen = gr.StellenMitSperrgrund();

        Assert.That(stellen, Is.EqualTo(new[]
        {
            "n:a⟨0xFF⟩.sh|", "n:b⟨0xFF⟩.bin|", $"n:{Paar}|{NichtEindeutig}", $"n:{Paar}|{NichtEindeutig}", "n:g.txt|", "n:in.txt|",
            "n:r⟨0xFF⟩.txt|", "n:t⟨0xFE⟩.txt|", $"n:{MitZeilenumbruch}|{NichtUebergebbar}", $"v:{Paar}|",
        }));
        Assert.That(stellen.Count(stelle => !stelle.EndsWith('|')), Is.EqualTo(3));
        Assert.That(gr.Zaehlung(), Is.EqualTo((0, 10)));
    }

    [Test]
    [Description("R00014 Kriterium 3")]
    public void Wenn_jede_der_zehn_Stellen_als_Diff_und_im_Stand_angesehen_dann_gesperrt_genau_bei_Fehlerausgang_am_Namen()
    {
        using var repo = FremdeNamenRepo.NMitV();
        var gr = HakenSperreSprache.Aufruf(repo, "n", "v");
        var stellen = gr.StellenMitSperrgrund();

        var abweichungen = new List<string>();
        foreach (var stelle in stellen)
        {
            var commitUndPfad = stelle[..stelle.LastIndexOf('|')];
            var sperrgrund = stelle[(stelle.LastIndexOf('|') + 1)..];
            var commit = commitUndPfad[..commitUndPfad.IndexOf(':')];
            var pfad = commitUndPfad[(commitUndPfad.IndexOf(':') + 1)..];
            var diff = gr.Diff(commit, pfad);
            var diffEndetAmNamen = diff.Ausgang == "name nicht lesbar";
            var istGesperrt = sperrgrund.Length > 0;
            if (diffEndetAmNamen != istGesperrt)
            {
                abweichungen.Add($"{commitUndPfad}: Diff {diff.Ausgang}, Sperrgrund „{sperrgrund}“");
            }
        }

        Assert.That(stellen, Has.Length.EqualTo(10), "Kontrolle: die ganze Menge ist abgetastet");
        Assert.That(abweichungen, Is.Empty);
        Assert.That(gr.Diff("n", "b⟨0xFF⟩.bin").Ausgang, Is.EqualTo("gelesen"));
        Assert.That(gr.Diff("n", "t⟨0xFE⟩.txt").Ausgang, Is.EqualTo("gelesen"));
    }

    [Test]
    [Description("R00014 Kriterium 3")]
    public void Wenn_der_alte_Name_einer_Umbenennung_Zeilenumbruch_und_Byte_traegt_dann_Diff_und_Stand_sagen_nicht_uebergebbar()
    {
        using var repo = FremdeNamenRepo.N();
        repo.CommitAnlegen("s", FremdeNamenRepo.SkriptAlterNameNichtUebergebbar);
        repo.CommitAnlegen("u", FremdeNamenRepo.SkriptUmbenennungAufLesbarenNamen);
        var gr = HakenSperreSprache.Aufruf(repo, "u");

        var stellen = gr.StellenMitSperrgrund();
        var diff = gr.Diff("u", "u.txt");
        var haken = gr.Hake("u", "u.txt");

        Assert.That(stellen, Is.EqualTo(new[] { $"u:u.txt|{NichtUebergebbar}" }));
        Assert.That(diff.Ausgang, Is.EqualTo("name nicht lesbar"));
        Assert.That((haken.Ausgang, haken.Grund), Is.EqualTo(("ungültig", NichtUebergebbar)));
    }

    private static bool IstAbgelehnterHaken(string protokollzeile)
    {
        return protokollzeile.Contains("[Haken]", StringComparison.Ordinal) && protokollzeile.Contains("abgelehnt", StringComparison.Ordinal);
    }
}
