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
        var ergebnis = gr.Beenden().Split('\n');
        var ungeprueftAb = Array.IndexOf(ergebnis, "Ungeprüft: 8 von 10");
        Assert.That(ungeprueftAb, Is.GreaterThan(0), "Kontrolle: der Abschnitt Dateien steht, ein Haken ist gesetzt");
        Assert.That(ergebnis[ungeprueftAb..].Count(zeile => zeile == $"- {Paar} (Commit {gr.Hash("n")}) — {NichtEindeutig}"), Is.EqualTo(2));
        Assert.That(ergebnis[ungeprueftAb..], Does.Contain($"- z⟨U+000A⟩⟨0xFF⟩.txt (Commit {gr.Hash("n")}) — {NichtUebergebbar}"));
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
    [Description("R00014 Kriterium 4")]
    public void Wenn_g_txt_abgehakt_und_beendet_dann_Byte_fuer_Byte_das_Beispiel_der_Anforderung()
    {
        using var repo = FremdeNamenRepo.NMitV();
        var gr = HakenSperreSprache.Aufruf(repo, "n", "v");
        gr.Hake("n", "g.txt");

        var ergebnis = gr.Beenden();

        var n = gr.Hash("n");
        var v = gr.Hash("v");
        Assert.That(ergebnis, Is.EqualTo(string.Join("\n",
            "# Ergebnis manueller Review", "", "Keine Anmerkungen.", "", "## Dateien", "", "Abgehakt: 1 von 10", "",
            $"- g.txt (Commit {n})", "", "Ungeprüft: 9 von 10", "",
            $"- a⟨0xFF⟩.sh (Commit {n})",
            $"- b⟨0xFF⟩.bin (Commit {n})",
            $"- f⟨0xFF⟩.txt (Commit {n}) — Diff nicht lesbar: Name nicht eindeutig",
            $"- f⟨0xFF⟩.txt (Commit {n}) — Diff nicht lesbar: Name nicht eindeutig",
            $"- in.txt (Commit {n})",
            $"- r⟨0xFF⟩.txt (Commit {n})",
            $"- t⟨0xFE⟩.txt (Commit {n})",
            $"- z⟨U+000A⟩⟨0xFF⟩.txt (Commit {n}) — Diff nicht lesbar: Name nicht übergebbar",
            $"- f⟨0xFF⟩.txt (Commit {v})") + "\n"));
    }

    [TestCase(false)]
    [TestCase(true)]
    [Description("R00014 Kriterium 5")]
    public void Wenn_kein_Haken_oder_ein_gesetzter_und_entnommener_dann_das_Ergebnis_aus_R00002_trotz_gesperrter_Stellen(bool setzenUndEntnehmen)
    {
        using var repo = FremdeNamenRepo.NMitV();
        var gr = HakenSperreSprache.Aufruf(repo, "n", "v");
        gr.Hake("n", Paar);
        if (setzenUndEntnehmen)
        {
            gr.Hake("n", "g.txt");
            gr.NimmHakenWeg("n", "g.txt");
        }

        var ergebnis = gr.Beenden();

        Assert.That(gr.StellenMitSperrgrund().Count(stelle => !stelle.EndsWith('|')), Is.EqualTo(3), "Kontrolle: gesperrte Stellen kommen vor");
        Assert.That(ergebnis, Is.EqualTo("# Ergebnis manueller Review\n\nKeine Anmerkungen.\n"));
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

    [Test]
    [Description("R00014 Kriterium 6")]
    public void Wenn_an_das_Paar_annotiert_werden_soll_dann_abgelehnt_ohne_Nummer_und_lesbare_Stellen_bekommen_1_und_2()
    {
        using var repo = FremdeNamenRepo.NMitV();
        var gr = HakenSperreSprache.Aufruf(repo, "n", "v");

        var paar = gr.Annotiere("n", Paar, 1);
        var nachDemPaar = gr.Anmerkungen();
        var a = gr.Annotiere("n", "a⟨0xFF⟩.sh", 1);
        var inV = gr.Annotiere("v", Paar, 2);
        var zeilenumbruch = gr.Annotiere("n", MitZeilenumbruch, 1);
        var ergebnis = gr.Beenden();

        Assert.That((paar.Ausgang, paar.Nummer, paar.Grund), Is.EqualTo(("ungültig", (int?)null, NichtEindeutig)));
        Assert.That(nachDemPaar, Is.Empty);
        Assert.That((a.Ausgang, a.Nummer), Is.EqualTo(("angelegt", (int?)1)));
        Assert.That((inV.Ausgang, inV.Nummer), Is.EqualTo(("angelegt", (int?)2)));
        Assert.That((zeilenumbruch.Ausgang, zeilenumbruch.Nummer), Is.EqualTo(("ungültig", (int?)null)), "schon die Formprüfung weist den Zeilenumbruch ab (R00002)");
        Assert.That(gr.Anmerkungen(), Is.EqualTo(new[] { "1. a⟨0xFF⟩.sh:1", "2. f⟨0xFF⟩.txt:2" }));
        var ueberschriften = ergebnis.Split('\n').Where(zeile => zeile.StartsWith("## ", StringComparison.Ordinal)).ToArray();
        Assert.That(ueberschriften, Is.EqualTo(new[] { "## 1. a⟨0xFF⟩.sh:1", "## 2. f⟨0xFF⟩.txt:2" }));
    }

    [Test]
    [Description("R00014 Kriterium 6 — Nacharbeit Karte 29: Sperre und Ergebnis vergleichen denselben kanonischen Namen")]
    public void Wenn_an_die_gesperrte_Stelle_mit_ihrer_Markenform_annotiert_werden_soll_dann_400_ohne_Nummer_und_lesbare_Stellen_bekommen_1_und_2()
    {
        using var repo = FremdeNamenRepo.NMitV();
        var gr = HakenSperreSprache.Aufruf(repo, "n", "v");
        const string Markenform = "z⟨U+000A⟩⟨0xFF⟩.txt";

        var gesperrt = gr.Annotiere("n", Markenform, 1);
        var nachGesperrt = gr.Anmerkungen();
        var a = gr.Annotiere("n", "a⟨0xFF⟩.sh", 1);
        var fInV = gr.Annotiere("v", "f⟨0xFF⟩.txt", 1);
        var ergebnis = gr.Beenden();

        Assert.That((gesperrt.Ausgang, gesperrt.Nummer, gesperrt.Grund), Is.EqualTo(("ungültig", (int?)null, NichtUebergebbar)));
        Assert.That(nachGesperrt, Is.Empty, "nichts gespeichert");
        Assert.That((a.Ausgang, a.Nummer), Is.EqualTo(("angelegt", (int?)1)), "Kontrolle: keine Nummer verbraucht");
        Assert.That((fInV.Ausgang, fInV.Nummer), Is.EqualTo(("angelegt", (int?)2)), "Kontrolle: keine Nummer verbraucht");
        Assert.That(gr.Anmerkungen(), Is.EqualTo(new[] { "1. a⟨0xFF⟩.sh:1", "2. f⟨0xFF⟩.txt:1" }));
        var ueberschriften = ergebnis.Split('\n').Where(zeile => zeile.StartsWith("## ", StringComparison.Ordinal)).ToArray();
        Assert.That(ueberschriften, Is.EqualTo(new[] { "## 1. a⟨0xFF⟩.sh:1", "## 2. f⟨0xFF⟩.txt:1" }), "keine Anmerkung an der gesperrten Stelle");
    }

    [Test]
    [Description("R00014 Kriterium 6")]
    public void Wenn_eine_Anmerkung_an_eine_gesperrte_Stelle_abgelehnt_wird_dann_nennt_das_Protokoll_den_Grund_und_nie_den_Namen()
    {
        using var repo = FremdeNamenRepo.NMitV();
        var gr = HakenSperreSprache.Aufruf(repo, "n", "v");

        gr.Annotiere("n", Paar, 1);

        Assert.That(gr.Protokollzeilen(), Has.One.EndsWith("[Anmerkung] abgelehnt: " + NichtEindeutig));
        Assert.That(gr.Protokollzeilen(), Has.None.Contains("f⟨0xFF⟩"));
    }

    [Test]
    [Description("R00014 Kriterium 6")]
    public void Wenn_an_eine_Umbenennung_mit_nicht_uebergebbarem_altem_Namen_annotiert_werden_soll_dann_abgelehnt_mit_Name_nicht_uebergebbar()
    {
        using var repo = FremdeNamenRepo.N();
        repo.CommitAnlegen("s", FremdeNamenRepo.SkriptAlterNameNichtUebergebbar);
        repo.CommitAnlegen("u", FremdeNamenRepo.SkriptUmbenennungAufLesbarenNamen);
        var gr = HakenSperreSprache.Aufruf(repo, "u");

        var anmerkung = gr.Annotiere("u", "u.txt", 8);

        Assert.That((anmerkung.Ausgang, anmerkung.Grund), Is.EqualTo(("ungültig", NichtUebergebbar)));
        Assert.That(gr.Anmerkungen(), Is.Empty);
    }

    [Test]
    [Description("R00014 Kriterium 7")]
    public void Wenn_die_Uebersicht_nicht_lesbar_ist_dann_Anmerkung_angelegt_Haken_abgelehnt_und_Ergebnis_ohne_Dateien()
    {
        using var repo = FremdeNamenRepo.NMitV();
        var gr = HakenSperreSprache.AufrufMitUnlesbarerUebersicht(repo, "n", "v");

        var anmerkung = gr.Annotiere("n", "g.txt", 1);
        var haken = gr.Hake("n", "g.txt");
        var ergebnis = gr.Beenden();

        Assert.That((anmerkung.Ausgang, anmerkung.Nummer), Is.EqualTo(("angelegt", (int?)1)));
        Assert.That((haken.Ausgang, haken.Grund), Is.EqualTo(("nicht lesbar", "Fortschritt konnte nicht gelesen werden")));
        Assert.That(gr.Protokollzeilen(), Has.Some.Contains("[Anmerkung]").And.Contains("Übersicht der Dateien nicht lesbar").And.Contains("fatal: bad object"));
        Assert.That(gr.Protokollzeilen(), Has.Some.Contains("[Haken]").And.Contains("Übersicht der Dateien nicht lesbar"));
        Assert.That(ergebnis, Does.StartWith($"# Ergebnis manueller Review\n\nAnmerkungen: 1\n\n## 1. g.txt:1\n\nCommit: {gr.Hash("n")}\n\n> Prüfen\n"));
        Assert.That(ergebnis, Does.Not.Contain("## Dateien"));
    }

    private static bool IstAbgelehnterHaken(string protokollzeile)
    {
        return protokollzeile.Contains("[Haken]", StringComparison.Ordinal) && protokollzeile.Contains("abgelehnt", StringComparison.Ordinal);
    }
}
