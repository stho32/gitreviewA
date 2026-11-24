using System.Runtime.Versioning;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Spezifikation R00011 „Datei abhaken“ auf Ebene des Interactors (Kriterien 1–4, 8, 13, 14; Szenarien 1–4 und 9 der User Story).
/// Ergebnis und Lastprofil: <see cref="DateiAbhakenErgebnisTests"/>; Anfrageschutz und Statuscodes: <c>Haken/HakenEndpunktTests</c>;
/// Kästchen, Fokus, Tastatur und Fremdtext im Browser: <c>e2e/tests/datei-abhaken.spec.js</c>.
/// </summary>
[UnsupportedOSPlatform("windows")]
public class DateiAbhakenTests
{
    private static readonly string[] Pqr = ["p", "q", "r"];

    [Test]
    public void Wenn_p_q_r_gestartet_dann_0_von_8_abgehakt_und_keine_Stelle_abgehakt()
    {
        using var repo = AbhakenRepo.Vorbereitung();
        var gr = DateiAbhakenSprache.Aufruf(repo, Pqr);

        Assert.That(gr.Fortschritt(), Is.EqualTo("0 von 8 abgehakt"));
        Assert.That(gr.Stellen("p", "q", "r"), Is.EqualTo(new[]
        {
            "p:README.md", "p:alt.txt", "p:src/a.txt", "p:src/b.txt", "q:LIESMICH.md", "q:alt.txt", "q:logo.bin", "q:src/b.txt",
        }));
        Assert.That(new[] { "README.md", "alt.txt", "src/a.txt", "src/b.txt" }.Any(datei => gr.IstAbgehakt("p", datei)), Is.False);
    }

    [Test]
    public void Wenn_nur_der_leere_Commit_r_gestartet_dann_0_von_0()
    {
        using var repo = AbhakenRepo.Vorbereitung();
        var gr = DateiAbhakenSprache.Aufruf(repo, ["r"]);

        Assert.That(gr.Fortschritt(), Is.EqualTo("0 von 0 abgehakt"));
    }

    [Test]
    public void Wenn_src_b_txt_in_q_abgehakt_dann_1_von_8_nur_in_q_und_nach_dem_Wegnehmen_0_von_8()
    {
        using var repo = AbhakenRepo.Vorbereitung();
        var gr = DateiAbhakenSprache.Aufruf(repo, Pqr);

        var gesetzt = gr.Hake("q", "src/b.txt");
        var fortschrittNachHaken = gr.Fortschritt();
        var inQ = gr.IstAbgehakt("q", "src/b.txt");
        var inP = gr.IstAbgehakt("p", "src/b.txt");
        var weggenommen = gr.NimmHakenWeg("q", "src/b.txt");

        Assert.That(gesetzt, Is.EqualTo(new Hakenantwort("gesetzt", 1, 8, "")));
        Assert.That((fortschrittNachHaken, inQ, inP), Is.EqualTo(("1 von 8 abgehakt", true, false)));
        Assert.That(weggenommen, Is.EqualTo(new Hakenantwort("gesetzt", 0, 8, "")));
        Assert.That(gr.Fortschritt(), Is.EqualTo("0 von 8 abgehakt"));
    }

    [Test]
    public void Wenn_derselbe_Haken_zweimal_gesendet_dann_aendert_der_zweite_nichts()
    {
        using var repo = AbhakenRepo.Vorbereitung();
        var gr = DateiAbhakenSprache.Aufruf(repo, Pqr);

        gr.Hake("q", "src/b.txt");
        var zweiter = gr.Hake("q", "src/b.txt");

        Assert.That(zweiter, Is.EqualTo(new Hakenantwort("gesetzt", 1, 8, "")));
    }

    [Test]
    public void Wenn_jede_der_acht_Stellen_einzeln_abgehakt_dann_steigt_der_Zaehler_je_um_eins_bis_8_von_8()
    {
        using var repo = AbhakenRepo.Vorbereitung();
        var gr = DateiAbhakenSprache.Aufruf(repo, Pqr);
        var stellen = new[]
        {
            ("p", "README.md"), ("p", "alt.txt"), ("p", "src/a.txt"), ("p", "src/b.txt"),
            ("q", "LIESMICH.md"), ("q", "alt.txt"), ("q", "logo.bin"), ("q", "src/b.txt"),
        };

        var zaehler = stellen.Select(stelle => gr.Hake(stelle.Item1, stelle.Item2).Abgehakt).ToArray();

        Assert.That(zaehler, Is.EqualTo(new[] { 1, 2, 3, 4, 5, 6, 7, 8 }));
        Assert.That(gr.Fortschritt(), Is.EqualTo("8 von 8 abgehakt"));
    }

    [Test]
    public void Wenn_README_md_in_p_abgehakt_und_der_Stand_mehrfach_gelesen_dann_bleibt_er_1_von_8_und_die_Uebersicht_wird_einmal_gelesen()
    {
        using var repo = AbhakenRepo.Vorbereitung();
        var gr = DateiAbhakenSprache.Aufruf(repo, Pqr);
        gr.Hake("p", "README.md");

        var fortschritte = Enumerable.Range(0, 4).Select(_ => gr.Fortschritt()).ToArray();

        Assert.That(fortschritte, Is.All.EqualTo("1 von 8 abgehakt"));
        Assert.That(gr.IstAbgehakt("p", "README.md"), Is.True);
        Assert.That(gr.Uebersichtslesungen(), Is.EqualTo(1));
    }

    [Test]
    public void Wenn_Stellen_ausserhalb_der_Auswahl_abgehakt_werden_sollen_dann_jedes_Mal_ungueltig_ohne_neue_Lesung_und_0_von_8()
    {
        using var repo = AbhakenRepo.VorbereitungMitFremdemCommit();
        var gr = DateiAbhakenSprache.Aufruf(repo, Pqr);
        gr.Fortschritt();
        var hashP = repo.Hash("p");

        var antworten = new[]
        {
            gr.HakeMitHash(repo.Hash("fremd"), "fremd.txt"),
            gr.HakeMitHash(hashP[..7], "alt.txt"),
            gr.Hake("r", "alt.txt"),
            gr.Hake("p", "src/c.txt"),
            gr.Hake("p", ""),
            gr.Hake("p", "alt.txt\nREADME.md"),
            gr.HakeMitHash(hashP.ToUpperInvariant(), "alt.txt"),
        };

        Assert.That(antworten.Select(antwort => antwort.Ausgang), Is.All.EqualTo("ungültig"));
        Assert.That(antworten.Select(antwort => antwort.Grund), Is.All.Not.Empty);
        Assert.That(gr.Fortschritt(), Is.EqualTo("0 von 8 abgehakt"));
        Assert.That(gr.Uebersichtslesungen(), Is.EqualTo(1), "eine abgelehnte Stelle liest die Übersicht nicht neu");
        Assert.That(gr.Hake("p", "alt.txt"), Is.EqualTo(new Hakenantwort("gesetzt", 1, 8, "")));
    }

    [Test]
    public void Wenn_Felder_fehlen_dann_ungueltig_und_die_Uebersicht_wird_nicht_gelesen()
    {
        using var repo = AbhakenRepo.Vorbereitung();
        var treiber = DateiAbhakenTreiber.Starten(repo.Ordner, [repo.Hash("p")]);

        var antworten = new[]
        {
            treiber.SetzeOhneKoerper(),
            treiber.Setze(null, null, true),
            treiber.Setze(repo.Hash("p"), null, true),
            treiber.Setze(repo.Hash("p"), "alt.txt", null),
        };

        Assert.That(antworten.Select(antwort => antwort.Ausgang), Is.All.EqualTo("ungültig"));
        Assert.That(treiber.Uebersichtslesungen(), Is.Zero);
    }

    [Test]
    [Description("R00015 Kriterium 9: ohne `commit` ist es der Stapel; die Datei muss in der Netto-Liste stehen")]
    public void Wenn_ohne_commit_aber_mit_datei_dann_ist_es_der_Stapel_ueber_die_Netto_Liste()
    {
        using var repo = AbhakenRepo.Vorbereitung();
        var treiber = DateiAbhakenTreiber.Starten(repo.Ordner, [repo.Hash("p")]);

        var ohneDateiInDerListe = treiber.Setze(null, "alt.txt", true);

        Assert.That((ohneDateiInDerListe.Ausgang, ohneDateiInDerListe.Grund), Is.EqualTo(("ungültig", "Datei steht nicht in der Netto-Liste")));
        Assert.That(treiber.Uebersichtslesungen(), Is.EqualTo(1), "der Stapel prüft die Sperre an der Übersicht");
    }

    [Test]
    public void Wenn_die_Uebersicht_nicht_lesbar_ist_dann_Stand_und_Haken_nicht_lesbar_und_eine_Fehlerzeile_mit_Hash()
    {
        const string hash = "13ba46c707f0744779fe7c52c3e935814b908017";
        var treiber = DateiAbhakenTreiber.MitUnlesbarerUebersicht(fehlversuche: 2, hash);

        var stand = treiber.Stand();
        var haken = treiber.Setze(hash, "a.txt", true);

        Assert.That((stand.IstLesbar, stand.Gesamt), Is.EqualTo((false, 0)));
        Assert.That(haken.Ausgang, Is.EqualTo("nicht lesbar"));
        var fehlerzeilen = treiber.Protokoll().Split('\n').Where(zeile => zeile.Contains("FEHLER", StringComparison.Ordinal)).ToArray();
        Assert.That(fehlerzeilen, Has.Length.EqualTo(2));
        Assert.That(fehlerzeilen, Is.All.Contain(hash));
    }

    [Test]
    public void Wenn_die_Uebersicht_erst_beim_zweiten_Lesen_gelingt_dann_ist_der_Stand_danach_lesbar()
    {
        const string hash = "13ba46c707f0744779fe7c52c3e935814b908017";
        var treiber = DateiAbhakenTreiber.MitUnlesbarerUebersicht(fehlversuche: 1, hash);

        var ersterStand = treiber.Stand();
        var zweiterStand = treiber.Stand();

        Assert.That((ersterStand.IstLesbar, zweiterStand.IstLesbar, zweiterStand.Gesamt), Is.EqualTo((false, true, 1)));
    }

    [Test]
    public void Wenn_aus_einem_Unterordner_gestartet_dann_gleicht_der_Stand_der_Uebersicht_aus_der_Wurzel()
    {
        using var repo = AbhakenRepo.Vorbereitung();
        var ausDerWurzel = DateiAbhakenSprache.Aufruf(repo, Pqr);
        var ausSrc = DateiAbhakenSprache.Aufruf(repo, Pqr, "src");

        var gesetzt = ausSrc.Hake("q", "src/b.txt");

        Assert.That(ausSrc.Stellen("p", "q", "r"), Is.EqualTo(ausDerWurzel.Stellen("p", "q", "r")));
        Assert.That(gesetzt.Ausgang, Is.EqualTo("gesetzt"));
    }

    [Test]
    public void Wenn_ein_Haken_gesetzt_dann_nennt_die_Debug_Zeile_Kurzhash_Pfad_mit_Marken_und_Zielzustand()
    {
        using var repo = AbhakenRepo.Y();
        var gr = DateiAbhakenSprache.Aufruf(repo, ["y"]);

        gr.Hake("y", AbhakenRepo.NameMitZeilenumbruchUndRichtungszeichen);
        gr.NimmHakenWeg("y", AbhakenRepo.NameMitZeilenumbruchUndRichtungszeichen);

        var hakenzeilen = gr.Protokollzeilen().Where(zeile => zeile.Contains("[Haken]", StringComparison.Ordinal)).ToArray();
        var kurz = repo.Hash("y")[..7];
        Assert.That(hakenzeilen, Has.Length.EqualTo(2));
        Assert.That(hakenzeilen[0], Does.EndWith($"Commit {kurz} ab⟨U+000A⟩cd⟨U+202E⟩.txt abgehakt: ja"));
        Assert.That(hakenzeilen[1], Does.EndWith($"Commit {kurz} ab⟨U+000A⟩cd⟨U+202E⟩.txt abgehakt: nein"));
    }
}
