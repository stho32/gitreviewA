using GitReviewA.Anmerkungen;
using GitReviewA.Beenden;
using GitReviewA.Haken;

namespace GitReviewA.Tests.Beenden;

public class ErgebnisFormatiererTests
{
    private const string HashA = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";
    private const string HashB = "b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5";
    private const string HashP = "13ba46c707f0744779fe7c52c3e935814b908017";
    private const string HashQ = "dd13577c75a05e64a0aa01cb6e9053d7548c83d0";
    private const string OhneAnmerkungen = "# Ergebnis manueller Review\n\nKeine Anmerkungen.\n";

    private static readonly Dateienstand KeineDateien = new([]);

    [Test]
    public void Wenn_keine_Anmerkungen_dann_Ueberschrift_Leerzeile_Keine_Anmerkungen_und_ein_Zeilenumbruch()
    {
        var ergebnis = ErgebnisFormatierer.Formatiere(new Anmerkungsliste([]), KeineDateien);

        Assert.That(ergebnis, Is.EqualTo("# Ergebnis manueller Review\n\nKeine Anmerkungen.\n"));
    }

    [Test]
    public void Wenn_Dateiname_Richtungs_und_Tag_Zeichen_enthaelt_dann_steht_in_der_Ueberschrift_die_Marke_auch_bei_ganzer_Datei()
    {
        var anmerkungen = new Anmerkungsliste(
        [
            new Anmerkung(1, HashA, "evil\u202Etxt.exe", 3, "Zeile"),
            new Anmerkung(2, HashA, "x\U000E0041y.txt", null, "Datei"),
        ]);

        var ergebnis = ErgebnisFormatierer.Formatiere(anmerkungen, KeineDateien);

        Assert.That(ergebnis, Does.Contain("\n## 1. evil⟨U+202E⟩txt.exe:3\n"));
        Assert.That(ergebnis, Does.Contain("\n## 2. x⟨U+E0041⟩y.txt (ganze Datei)\n"));
    }

    [Test]
    public void Wenn_stabile_Nummern_Luecken_haben_dann_zaehlen_die_Ueberschriften_nach_Position_1_2_3()
    {
        var anmerkungen = new Anmerkungsliste(
        [
            new Anmerkung(1, HashA, "a.txt", 1, "eins"),
            new Anmerkung(3, HashA, "a.txt", 3, "drei"),
            new Anmerkung(4, HashA, "a.txt", 4, "vier"),
        ]);

        var ergebnis = ErgebnisFormatierer.Formatiere(anmerkungen, KeineDateien);

        var ueberschriften = ergebnis.Split('\n').Where(zeile => zeile.StartsWith("## ", StringComparison.Ordinal));
        Assert.That(ueberschriften, Is.EqualTo(new[] { "## 1. a.txt:1", "## 2. a.txt:3", "## 3. a.txt:4" }));
    }

    [Test]
    public void Wenn_zwei_Anmerkungen_dann_genau_das_Beispiel_der_Anforderung()
    {
        var anmerkungen = new Anmerkungsliste(
        [
            new Anmerkung(1, HashA, "src/Foo.cs", 42, "Null-Prüfung fehlt"),
            new Anmerkung(2, HashB, "README.md", null, "Abschnitt Installation veraltet"),
        ]);

        var ergebnis = ErgebnisFormatierer.Formatiere(anmerkungen, KeineDateien);

        Assert.That(ergebnis, Is.EqualTo(
            "# Ergebnis manueller Review\n\nAnmerkungen: 2\n\n"
            + "## 1. src/Foo.cs:42\n\nCommit: " + HashA + "\n\n> Null-Prüfung fehlt\n\n"
            + "## 2. README.md (ganze Datei)\n\nCommit: " + HashB + "\n\n> Abschnitt Installation veraltet\n"));
    }

    [Test]
    public void Wenn_Text_mehrzeilig_mit_Ueberschrift_dann_jede_Zeile_als_Zitat_und_leere_Zeile_als_Zitatzeichen()
    {
        var ergebnis = ErgebnisFormatierer.Formatiere(new Anmerkungsliste([new Anmerkung(1, HashA, "src/Foo.cs", 1, "Zeile 1\n\n## Fertig")]), KeineDateien);

        Assert.That(ergebnis, Does.EndWith("\n\n> Zeile 1\n>\n> ## Fertig\n"));
        Assert.That(ergebnis.Split('\n').Count(zeile => zeile.StartsWith('#')), Is.EqualTo(2));
    }

    [TestCase("a\r\nb\rc\nd")]
    [TestCase("a\r\n\r\nb")]
    public void Wenn_Zeilenenden_CRLF_oder_CR_dann_LF_und_jede_Zeile_zitiert(string text)
    {
        var ergebnis = ErgebnisFormatierer.Formatiere(new Anmerkungsliste([new Anmerkung(1, HashA, "a.txt", 1, text)]), KeineDateien);

        Assert.That(ergebnis, Does.Not.Contain("\r"));
        var zitat = ergebnis[(ergebnis.IndexOf("\n\n>", StringComparison.Ordinal) + 2)..];
        Assert.That(zitat.TrimEnd('\n').Split('\n'), Is.All.Match("^>( |$)"));
    }

    [Test]
    public void Wenn_Text_mit_Sonderzeichen_und_Einrueckung_dann_unveraendert_hinter_dem_Zitatzeichen()
    {
        var ergebnis = ErgebnisFormatierer.Formatiere(new Anmerkungsliste([new Anmerkung(1, HashA, "a.txt", 1, "  Prüfen: größer ≥ 3 <b>`x`</b>\t")]), KeineDateien);

        Assert.That(ergebnis, Does.EndWith("\n\n>   Prüfen: größer ≥ 3 <b>`x`</b>\t\n"));
    }

    [Test]
    public void Wenn_500_Anmerkungen_dann_Abschnitte_1_bis_500_in_Reihenfolge()
    {
        var anmerkungen = new Anmerkungsliste(Enumerable.Range(1, 500).Select(nummer => new Anmerkung(nummer, HashA, "a.txt", nummer, new string('x', 200))));

        var ergebnis = ErgebnisFormatierer.Formatiere(anmerkungen, KeineDateien);

        var ueberschriften = ergebnis.Split('\n').Where(zeile => zeile.StartsWith("## ", StringComparison.Ordinal));
        Assert.That(ueberschriften, Is.EqualTo(Enumerable.Range(1, 500).Select(nummer => $"## {nummer}. a.txt:{nummer}")));
        Assert.That(ergebnis, Does.StartWith("# Ergebnis manueller Review\n\nAnmerkungen: 500\n\n## 1. "));
    }

    [Test]
    public void Wenn_README_in_p_und_src_b_in_q_abgehakt_dann_Abschnitt_Dateien_wie_im_Beispiel_der_User_Story()
    {
        var dateien = VorbereitungPqr(("p", "README.md"), ("q", "src/b.txt"));

        var ergebnis = ErgebnisFormatierer.Formatiere(new Anmerkungsliste([]), dateien);

        Assert.That(ergebnis, Is.EqualTo(
            "# Ergebnis manueller Review\n\nKeine Anmerkungen.\n\n## Dateien\n\nAbgehakt: 2 von 8\n\n"
            + $"- README.md (Commit {HashP})\n- src/b.txt (Commit {HashQ})\n\n"
            + "Ungeprüft: 6 von 8\n\n"
            + $"- alt.txt (Commit {HashP})\n- src/a.txt (Commit {HashP})\n- src/b.txt (Commit {HashP})\n"
            + $"- LIESMICH.md (Commit {HashQ})\n- alt.txt (Commit {HashQ})\n- logo.bin (Commit {HashQ})\n"));
    }

    [Test]
    public void Wenn_alle_Stellen_abgehakt_dann_Ungeprueft_0_von_8_ohne_Aufzaehlung_und_ohne_weitere_Leerzeile()
    {
        var alle = new[] { "README.md", "alt.txt", "src/a.txt", "src/b.txt" }.Select(datei => ("p", datei))
            .Concat(new[] { "LIESMICH.md", "alt.txt", "logo.bin", "src/b.txt" }.Select(datei => ("q", datei))).ToArray();

        var ergebnis = ErgebnisFormatierer.Formatiere(new Anmerkungsliste([]), VorbereitungPqr(alle));

        Assert.That(ergebnis, Does.Contain("\n\nAbgehakt: 8 von 8\n\n- README.md"));
        Assert.That(ergebnis, Does.EndWith($"- src/b.txt (Commit {HashQ})\n\nUngeprüft: 0 von 8\n"));
    }

    [Test]
    public void Wenn_Stellen_bekannt_aber_kein_Haken_dann_Byte_fuer_Byte_das_Ergebnis_aus_R00002()
    {
        var ergebnis = ErgebnisFormatierer.Formatiere(new Anmerkungsliste([]), VorbereitungPqr());

        Assert.That(ergebnis, Is.EqualTo(OhneAnmerkungen));
    }

    [Test]
    public void Wenn_Anmerkungen_und_Haken_dann_erst_die_Anmerkungen_und_genau_eine_Ueberschrift_Dateien()
    {
        var anmerkungen = new Anmerkungsliste([new Anmerkung(1, HashP, "README.md", 1, "## Dateien\nAbgehakt: 8 von 8")]);

        var ergebnis = ErgebnisFormatierer.Formatiere(anmerkungen, VorbereitungPqr(("p", "README.md")));

        Assert.That(ergebnis, Does.StartWith($"# Ergebnis manueller Review\n\nAnmerkungen: 1\n\n## 1. README.md:1\n\nCommit: {HashP}\n\n> ## Dateien\n> Abgehakt: 8 von 8\n\n## Dateien\n\nAbgehakt: 1 von 8\n\n"));
        Assert.That(ergebnis.Split('\n').Count(zeile => zeile == "## Dateien"), Is.EqualTo(1));
    }

    [Test]
    public void Wenn_ein_Pfad_Zeilenumbruch_Richtungs_Nullbreiten_und_Tag_Zeichen_traegt_dann_steht_er_mit_Marken_in_einer_Zeile()
    {
        var dateien = new Dateienstand([new Stellenstand(HashP, "ab\ncd\u202E\u200B\U000E0041\u001b.txt", true, string.Empty)]);

        var ergebnis = ErgebnisFormatierer.Formatiere(new Anmerkungsliste([]), dateien);

        Assert.That(ergebnis, Does.Contain($"\n- ab⟨U+000A⟩cd⟨U+202E⟩⟨U+200B⟩⟨U+E0041⟩⟨U+001B⟩.txt (Commit {HashP})\n"));
    }

    [Test]
    public void Wenn_2000_Stellen_und_1000_abgehakt_dann_je_1000_Zeilen_und_die_Zeit_steht_im_Testprotokoll()
    {
        var stellen = Enumerable.Range(1, 2000).Select(nummer => new Stellenstand(HashP, $"viele/datei-{nummer:D4}.txt", nummer % 2 == 0, string.Empty));
        var dateien = new Dateienstand(stellen);
        var uhr = System.Diagnostics.Stopwatch.StartNew();

        var ergebnis = ErgebnisFormatierer.Formatiere(new Anmerkungsliste([]), dateien);

        uhr.Stop();
        TestContext.Out.WriteLine($"Formatieren mit 2000 Stellen: {uhr.Elapsed.TotalMilliseconds:F1} ms");
        var zeilen = ergebnis.Split('\n');
        Assert.That(zeilen, Does.Contain("Abgehakt: 1000 von 2000").And.Contain("Ungeprüft: 1000 von 2000"));
        Assert.That(zeilen.Count(zeile => zeile.StartsWith("- viele/", StringComparison.Ordinal)), Is.EqualTo(2000));
        Assert.That(uhr.Elapsed, Is.LessThan(TimeSpan.FromMilliseconds(700)));
    }

    [Test]
    [Description("R00014 Kriterium 4")]
    public void Wenn_Repo_N_mit_v_und_g_txt_abgehakt_dann_Byte_fuer_Byte_das_Beispiel_mit_Sperrgrund_nur_an_den_gesperrten_Zeilen()
    {
        const string NichtEindeutig = "Diff nicht lesbar: Name nicht eindeutig";
        const string NichtUebergebbar = "Diff nicht lesbar: Name nicht übergebbar";
        var dateien = new Dateienstand(
        [
            new Stellenstand(HashP, "a⟨0xFF⟩.sh", false, string.Empty),
            new Stellenstand(HashP, "b⟨0xFF⟩.bin", false, string.Empty),
            new Stellenstand(HashP, "f⟨0xFF⟩.txt", false, NichtEindeutig),
            new Stellenstand(HashP, "f⟨0xFF⟩.txt", false, NichtEindeutig),
            new Stellenstand(HashP, "g.txt", true, string.Empty),
            new Stellenstand(HashP, "in.txt", false, string.Empty),
            new Stellenstand(HashP, "r⟨0xFF⟩.txt", false, string.Empty),
            new Stellenstand(HashP, "t⟨0xFE⟩.txt", false, string.Empty),
            new Stellenstand(HashP, "z\n⟨0xFF⟩.txt", false, NichtUebergebbar),
            new Stellenstand(HashQ, "f⟨0xFF⟩.txt", false, string.Empty),
        ]);

        var ergebnis = ErgebnisFormatierer.Formatiere(new Anmerkungsliste([]), dateien);

        Assert.That(ergebnis, Is.EqualTo(
            "# Ergebnis manueller Review\n\nKeine Anmerkungen.\n\n## Dateien\n\nAbgehakt: 1 von 10\n\n"
            + $"- g.txt (Commit {HashP})\n\n"
            + "Ungeprüft: 9 von 10\n\n"
            + $"- a⟨0xFF⟩.sh (Commit {HashP})\n"
            + $"- b⟨0xFF⟩.bin (Commit {HashP})\n"
            + $"- f⟨0xFF⟩.txt (Commit {HashP}) — Diff nicht lesbar: Name nicht eindeutig\n"
            + $"- f⟨0xFF⟩.txt (Commit {HashP}) — Diff nicht lesbar: Name nicht eindeutig\n"
            + $"- in.txt (Commit {HashP})\n"
            + $"- r⟨0xFF⟩.txt (Commit {HashP})\n"
            + $"- t⟨0xFE⟩.txt (Commit {HashP})\n"
            + $"- z⟨U+000A⟩⟨0xFF⟩.txt (Commit {HashP}) — Diff nicht lesbar: Name nicht übergebbar\n"
            + $"- f⟨0xFF⟩.txt (Commit {HashQ})\n"));
    }

    [Test]
    [Description("R00014 Kriterium 4")]
    public void Wenn_ein_gesperrter_Name_Richtungs_Nullbreiten_und_Tag_Zeichen_traegt_dann_steht_er_mit_Marken_und_Grund_in_genau_einer_Zeile()
    {
        var dateien = new Dateienstand(
        [
            new Stellenstand(HashP, "g.txt", true, string.Empty),
            new Stellenstand(HashP, "x\n\u202E\u200B\U000E0041.txt", false, "Diff nicht lesbar: Name nicht übergebbar"),
        ]);

        var ergebnis = ErgebnisFormatierer.Formatiere(new Anmerkungsliste([]), dateien);

        var zeilen = ergebnis.Split('\n');
        Assert.That(zeilen, Does.Contain($"- x⟨U+000A⟩⟨U+202E⟩⟨U+200B⟩⟨U+E0041⟩.txt (Commit {HashP}) — Diff nicht lesbar: Name nicht übergebbar"));
        Assert.That(zeilen.Count(zeile => zeile.Contains("Name nicht übergebbar", StringComparison.Ordinal)), Is.EqualTo(1));
    }

    [Test]
    [Description("R00014 Kriterium 5")]
    public void Wenn_gesperrte_Stellen_vorkommen_aber_kein_Haken_gesetzt_dann_Byte_fuer_Byte_das_Ergebnis_aus_R00002()
    {
        var dateien = new Dateienstand([new Stellenstand(HashP, "f.txt", false, "Diff nicht lesbar: Name nicht eindeutig"), new Stellenstand(HashP, "g.txt", false, string.Empty)]);

        var ergebnis = ErgebnisFormatierer.Formatiere(new Anmerkungsliste([]), dateien);

        Assert.That(ergebnis, Is.EqualTo(OhneAnmerkungen));
    }

    [Test]
    [Description("R00031 Kriterium 11: Bereichsstelle, Commit, Zitat der markierten Zeilen, Textzitat")]
    public void Wenn_Bereich_3_bis_7_mit_gelesenen_Zeilen_dann_Stelle_Commit_Zitat_und_Text()
    {
        var anmerkungen = new Anmerkungsliste([new Anmerkung(1, HashA, "lang.txt", null, "Klammer fehlt", 3, 7)]);
        var zitate = Zitate((1, ["z03", "z04", "Z05", "z06", "z07"]));

        var ergebnis = ErgebnisFormatierer.Formatiere(anmerkungen, KeineDateien, zitate);

        Assert.That(ergebnis, Is.EqualTo(
            "# Ergebnis manueller Review\n\nAnmerkungen: 1\n\n"
            + "## 1. lang.txt:3-7\n\nCommit: " + HashA + "\n\n"
            + "    3: z03\n    4: z04\n    5: Z05\n    6: z06\n    7: z07\n\n"
            + "> Klammer fehlt\n"));
    }

    [Test]
    [Description("R00031 Kriterium 11: ohne lesbare Zeilen bleibt der Abschnitt bei Stelle und Text — nichts wird still behauptet")]
    public void Wenn_der_Bereich_nicht_gelesen_werden_konnte_dann_ohne_Zitat()
    {
        var anmerkungen = new Anmerkungsliste([new Anmerkung(1, HashA, "lang.txt", null, "Klammer fehlt", 3, 7)]);
        var zitate = Zitate((1, null));

        var ergebnis = ErgebnisFormatierer.Formatiere(anmerkungen, KeineDateien, zitate);

        Assert.That(ergebnis, Is.EqualTo(
            "# Ergebnis manueller Review\n\nAnmerkungen: 1\n\n"
            + "## 1. lang.txt:3-7\n\nCommit: " + HashA + "\n\n> Klammer fehlt\n"));
    }

    [Test]
    [Description("R00031 Kriterium 12: höchstens 20 Zeilen, danach genau eine Zeile „… (k weitere Zeilen)“")]
    public void Wenn_der_Bereich_23_Zeilen_umfasst_dann_20_Zeilen_und_eine_Restzeile()
    {
        var anmerkungen = new Anmerkungsliste([new Anmerkung(1, HashA, "lang.txt", null, "lang", 1, 23)]);
        var zitate = Zitate((1, Enumerable.Range(1, 23).Select(nummer => $"z{nummer:D2}").ToArray()));

        var ergebnis = ErgebnisFormatierer.Formatiere(anmerkungen, KeineDateien, zitate);

        var erwarteteZeilen = Enumerable.Range(1, 20).Select(nummer => $"    {nummer}: z{nummer:D2}").Append("    … (3 weitere Zeilen)");
        Assert.That(ergebnis, Does.Contain("\n\n" + string.Join("\n", erwarteteZeilen) + "\n\n> lang\n"));
        Assert.That(ergebnis.Split('\n').Count(zeile => zeile.Contains("weitere Zeilen", StringComparison.Ordinal)), Is.EqualTo(1));
    }

    [TestCase(199)]
    [TestCase(200)]
    [Description("Befund S1: eine Zitatzeile bis 200 Zeichen steht vollständig, ohne Restzahl")]
    public void Wenn_eine_markierte_Zeile_bis_200_Zeichen_hat_dann_unveraendert(int laenge)
    {
        var anmerkungen = new Anmerkungsliste([new Anmerkung(1, HashA, "lang.txt", null, "lang", 1, 1)]);
        var zitate = Zitate((1, [new string('x', laenge)]));

        var ergebnis = ErgebnisFormatierer.Formatiere(anmerkungen, KeineDateien, zitate);

        Assert.That(ergebnis, Does.Contain("    1: " + new string('x', laenge) + "\n"));
        Assert.That(ergebnis, Does.Not.Contain("weitere Zeichen"));
    }

    [Test]
    [Description("Befund S1: ab 201 Zeichen stehen 200 Zeichen und die Zahl der übrigen")]
    public void Wenn_eine_markierte_Zeile_201_Zeichen_hat_dann_200_Zeichen_und_die_Zahl_der_uebrigen()
    {
        var anmerkungen = new Anmerkungsliste([new Anmerkung(1, HashA, "lang.txt", null, "lang", 1, 1)]);
        var zitate = Zitate((1, [new string('x', 201)]));

        var ergebnis = ErgebnisFormatierer.Formatiere(anmerkungen, KeineDateien, zitate);

        Assert.That(ergebnis, Does.Contain("    1: " + new string('x', 200) + " … (1 weitere Zeichen)\n"));
    }

    [Test]
    [Description("Befund S1: die Grenze zerschneidet kein Surrogatpaar — das Emoji als 200. Zeichen bleibt ganz, als 201. fällt es weg")]
    public void Wenn_ein_Surrogatpaar_an_der_Grenze_steht_dann_wird_es_nicht_zerschnitten()
    {
        const string Emoji = "\U0001F600";
        var zweiZeilen = new[] { new string('x', 199) + Emoji, new string('x', 200) + Emoji };
        var anmerkungen = new Anmerkungsliste([new Anmerkung(1, HashA, "lang.txt", null, "lang", 1, 2)]);
        var zitate = Zitate((1, zweiZeilen));

        var ergebnis = ErgebnisFormatierer.Formatiere(anmerkungen, KeineDateien, zitate);

        Assert.That(ergebnis, Does.Contain("    1: " + zweiZeilen[0] + "\n    2: " + new string('x', 200) + " … (1 weitere Zeichen)\n"));
    }

    [Test]
    [Description("Befund S1: die Marken zählen mit — 300 Richtungszeichen ergeben eine Zitatzeile von 200 Zeichen plus Restzahl")]
    public void Wenn_eine_markierte_Zeile_300_Richtungszeichen_traegt_dann_bleibt_die_Zitatzeile_kurz()
    {
        const string Marke = "⟨U+202E⟩";
        var markiert = string.Concat(Enumerable.Repeat(Marke, 300));
        var anmerkungen = new Anmerkungsliste([new Anmerkung(1, HashA, "lang.txt", null, "lang", 1, 1)]);
        var zitate = Zitate((1, [new string('\u202E', 300)]));

        var ergebnis = ErgebnisFormatierer.Formatiere(anmerkungen, KeineDateien, zitate);

        Assert.That(ergebnis, Does.Contain("    1: " + markiert[..200] + $" … ({markiert.Length - 200} weitere Zeichen)\n"));
    }

    [Test]
    [Description("R00031 Kriterium 11: Zeilen- und Dateianmerkung bleiben Byte für Byte wie R00002, die Bereichsregeln ändern daran nichts")]
    public void Wenn_Bereich_Zeile_und_Datei_zusammen_dann_nur_der_Bereich_mit_Zitat()
    {
        var anmerkungen = new Anmerkungsliste(
        [
            new Anmerkung(1, HashA, "lang.txt", null, "Bereich", 3, 7),
            new Anmerkung(2, HashA, "lang.txt", 20, "Zeile"),
            new Anmerkung(3, HashA, "lang.txt", null, "Datei"),
        ]);
        var zitate = Zitate((1, ["z03", "z04", "Z05", "z06", "z07"]));

        var ergebnis = ErgebnisFormatierer.Formatiere(anmerkungen, KeineDateien, zitate);

        Assert.That(ergebnis, Is.EqualTo(
            "# Ergebnis manueller Review\n\nAnmerkungen: 3\n\n"
            + "## 1. lang.txt:3-7\n\nCommit: " + HashA + "\n\n    3: z03\n    4: z04\n    5: Z05\n    6: z06\n    7: z07\n\n> Bereich\n\n"
            + "## 2. lang.txt:20\n\nCommit: " + HashA + "\n\n> Zeile\n\n"
            + "## 3. lang.txt (ganze Datei)\n\nCommit: " + HashA + "\n\n> Datei\n"));
    }

    [TestCase("\u202E", "⟨U+202E⟩")]
    [TestCase("\u200B", "⟨U+200B⟩")]
    [TestCase("\U000E0041", "⟨U+E0041⟩")]
    [Description("R00031 Kriterium 13: unsichtbare und richtungsändernde Zeichen der markierten Zeilen stehen als Marke im Zitat")]
    public void Wenn_eine_markierte_Zeile_Unsichtbares_traegt_dann_steht_die_Marke_im_Zitat(string zeichen, string marke)
    {
        var anmerkungen = new Anmerkungsliste([new Anmerkung(1, HashA, "fremd.txt", null, "Text", 1, 2)]);
        var zitate = Zitate((1, ["a" + zeichen + "b", "<b>z20</b>"]));

        var ergebnis = ErgebnisFormatierer.Formatiere(anmerkungen, KeineDateien, zitate);

        Assert.That(ergebnis, Does.Contain($"\n    1: a{marke}b\n    2: <b>z20</b>\n"));
    }

    /// <summary>Die gelesenen Zeilen je stabiler Nummer; `null` steht für „nicht lesbar“ (kein Zitat).</summary>
    private static Dictionary<int, Bereichszeilenlesung> Zitate(params (int Nummer, string[]? Zeilen)[] eintraege)
    {
        return eintraege.ToDictionary(
            eintrag => eintrag.Nummer,
            eintrag => eintrag.Zeilen is null
                ? new Bereichszeilenlesung(Bereichszeilenausgang.UeberDerGrenze, [], "Diff nicht lesbar: über der Ausgabegrenze")
                : new Bereichszeilenlesung(Bereichszeilenausgang.Gelesen, eintrag.Zeilen, string.Empty));
    }

    /// <summary>Die acht Stellen aus R00003 in Auswahlreihenfolge; abgehakt sind die genannten (Commitname, Pfad).</summary>
    private static Dateienstand VorbereitungPqr(params (string Commit, string Datei)[] abgehakt)
    {
        var stellen = new[]
        {
            ("p", "README.md"), ("p", "alt.txt"), ("p", "src/a.txt"), ("p", "src/b.txt"),
            ("q", "LIESMICH.md"), ("q", "alt.txt"), ("q", "logo.bin"), ("q", "src/b.txt"),
        };
        var hashNachName = new Dictionary<string, string> { ["p"] = HashP, ["q"] = HashQ };
        return new Dateienstand(stellen.Select(stelle => new Stellenstand(hashNachName[stelle.Item1], stelle.Item2, abgehakt.Contains(stelle), string.Empty)));
    }
}
