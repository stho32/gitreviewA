using System.Runtime.Versioning;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Nacharbeit Security-Review #16 (R00011): Namen aus ungültigem UTF-8 fallen nie auf eine Stelle zusammen. Jedes fremde Byte steht als
/// `⟨0xFF⟩` im Namen; trifft ein Name trotzdem einen zweiten derselben Commits (wörtlicher Doppelgänger), sind beide nicht abhakbar.
/// Immer gilt: Abgehakt ≤ angenommene Haken, Abgehakt + Ungeprüft = Gesamt.
/// </summary>
[UnsupportedOSPlatform("windows")]
public class DateiAbhakenFremdeBytesTests
{
    private const string Ersatzzeichen = "�";
    private const string NameMitFF = "f⟨0xFF⟩.txt";
    private const string NameMitFE = "f⟨0xFE⟩.txt";

    [Test]
    public void Wenn_der_verlustbehaftete_Name_f_FFFD_txt_abgehakt_werden_soll_dann_abgelehnt_und_nie_zwei_Stellen_abgehakt()
    {
        using var repo = AbhakenRepo.U();
        var gr = DateiAbhakenSprache.Aufruf(repo, ["u"]);

        var antwort = gr.Hake("u", "f" + Ersatzzeichen + ".txt");

        Assert.That(antwort.Ausgang, Is.EqualTo("ungültig"));
        Assert.That(gr.Fortschritt(), Is.EqualTo("0 von 3 abgehakt"));
    }

    [Test]
    public void Wenn_Namen_aus_fremden_Bytes_gelesen_dann_stehen_sie_unterscheidbar_mit_Bytemarken_im_Stand()
    {
        using var repo = AbhakenRepo.U();
        var gr = DateiAbhakenSprache.Aufruf(repo, ["u"]);

        Assert.That(gr.Stellen("u"), Is.EqualTo(new[] { "u:" + NameMitFE, "u:" + NameMitFF, "u:g.txt" }));
    }

    [Test]
    public void Wenn_f_0xFF_abgehakt_dann_1_von_3_und_nur_diese_Stelle_abgehakt()
    {
        using var repo = AbhakenRepo.U();
        var gr = DateiAbhakenSprache.Aufruf(repo, ["u"]);

        var antwort = gr.Hake("u", NameMitFF);

        Assert.That((antwort.Ausgang, antwort.Abgehakt, antwort.Gesamt), Is.EqualTo(("gesetzt", 1, 3)));
        Assert.That(gr.Fortschritt(), Is.EqualTo("1 von 3 abgehakt"));
        Assert.That((gr.IstAbgehakt("u", NameMitFF), gr.IstAbgehakt("u", NameMitFE), gr.IstAbgehakt("u", "g.txt")), Is.EqualTo((true, false, false)));
    }

    [Test]
    public void Wenn_g_txt_abgehakt_dann_1_von_3_wie_bei_jedem_Namen()
    {
        using var repo = AbhakenRepo.U();
        var gr = DateiAbhakenSprache.Aufruf(repo, ["u"]);

        var antwort = gr.Hake("u", "g.txt");

        Assert.That((antwort.Ausgang, gr.Fortschritt()), Is.EqualTo(("gesetzt", "1 von 3 abgehakt")));
    }

    [Test]
    public void Wenn_f_0xFF_abgehakt_und_beendet_dann_nennt_das_Ergebnis_beide_Namen_mit_Bytemarken_und_ohne_Ersatzzeichen()
    {
        using var repo = AbhakenRepo.U();
        var gr = DateiAbhakenSprache.Aufruf(repo, ["u"]);
        gr.Hake("u", NameMitFF);

        var ergebnis = gr.Beenden();

        var erwartet = string.Join("\n",
            "# Ergebnis manueller Review", "", "Keine Anmerkungen.", "", "## Dateien", "", "Abgehakt: 1 von 3", "",
            gr.Ergebniszeile("u", NameMitFF), "", "Ungeprüft: 2 von 3", "",
            gr.Ergebniszeile("u", NameMitFE), gr.Ergebniszeile("u", "g.txt")) + "\n";
        Assert.That(ergebnis, Is.EqualTo(erwartet));
        Assert.That(ergebnis, Does.Not.Contain(Ersatzzeichen));
    }

    [Test]
    public void Wenn_ein_Name_woertlich_wie_die_Bytemarke_heisst_dann_sind_beide_gesperrt_und_bleiben_im_Ergebnis_ungeprueft()
    {
        using var repo = AbhakenRepo.U(doppelgaenger: NameMitFF);
        var gr = DateiAbhakenSprache.Aufruf(repo, ["u"]);

        var mehrdeutig = gr.Hake("u", NameMitFF);
        var kontrolle = gr.Hake("u", "g.txt");
        var ergebnis = gr.Beenden();

        Assert.That(mehrdeutig.Ausgang, Is.EqualTo("ungültig"));
        Assert.That(mehrdeutig.Grund, Is.EqualTo("Diff nicht lesbar: Name nicht eindeutig"));
        Assert.That((kontrolle.Ausgang, kontrolle.Abgehakt, kontrolle.Gesamt), Is.EqualTo(("gesetzt", 1, 3)));
        var zeilen = ergebnis.Split('\n');
        var zeileDesDoppelgaengers = gr.Ergebniszeile("u", NameMitFF) + " — Diff nicht lesbar: Name nicht eindeutig";
        var ungeprueftAb = Array.IndexOf(zeilen, "Ungeprüft: 2 von 3");
        Assert.That(zeilen, Does.Contain("Abgehakt: 1 von 3"));
        Assert.That(ungeprueftAb, Is.GreaterThan(0));
        Assert.That(zeilen[ungeprueftAb..].Count(zeile => zeile == zeileDesDoppelgaengers), Is.EqualTo(2));
    }

    [Test]
    public void Wenn_ein_gueltiger_Name_das_Ersatzzeichen_traegt_dann_ist_er_vom_Namen_aus_dem_Byte_0xFF_getrennt_abhakbar()
    {
        var nameMitErsatzzeichen = "f" + Ersatzzeichen + ".txt";
        using var repo = AbhakenRepo.U(doppelgaenger: nameMitErsatzzeichen);
        var gr = DateiAbhakenSprache.Aufruf(repo, ["u"]);

        var antwort = gr.Hake("u", nameMitErsatzzeichen);

        Assert.That((antwort.Ausgang, gr.Fortschritt()), Is.EqualTo(("gesetzt", "1 von 3 abgehakt")));
        Assert.That(gr.IstAbgehakt("u", NameMitFF), Is.False);
    }
}
