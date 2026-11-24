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
        var dateien = new Dateienstand([new Stellenstand(HashP, "ab\ncd\u202E\u200B\U000E0041\u001b.txt", true)]);

        var ergebnis = ErgebnisFormatierer.Formatiere(new Anmerkungsliste([]), dateien);

        Assert.That(ergebnis, Does.Contain($"\n- ab⟨U+000A⟩cd⟨U+202E⟩⟨U+200B⟩⟨U+E0041⟩⟨U+001B⟩.txt (Commit {HashP})\n"));
    }

    [Test]
    public void Wenn_2000_Stellen_und_1000_abgehakt_dann_je_1000_Zeilen_und_die_Zeit_steht_im_Testprotokoll()
    {
        var stellen = Enumerable.Range(1, 2000).Select(nummer => new Stellenstand(HashP, $"viele/datei-{nummer:D4}.txt", nummer % 2 == 0));
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

    /// <summary>Die acht Stellen aus R00003 in Auswahlreihenfolge; abgehakt sind die genannten (Commitname, Pfad).</summary>
    private static Dateienstand VorbereitungPqr(params (string Commit, string Datei)[] abgehakt)
    {
        var stellen = new[]
        {
            ("p", "README.md"), ("p", "alt.txt"), ("p", "src/a.txt"), ("p", "src/b.txt"),
            ("q", "LIESMICH.md"), ("q", "alt.txt"), ("q", "logo.bin"), ("q", "src/b.txt"),
        };
        var hashNachName = new Dictionary<string, string> { ["p"] = HashP, ["q"] = HashQ };
        return new Dateienstand(stellen.Select(stelle => new Stellenstand(hashNachName[stelle.Item1], stelle.Item2, abgehakt.Contains(stelle))));
    }
}
