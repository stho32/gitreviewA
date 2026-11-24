using System.Net;
using System.Runtime.Versioning;
using System.Text;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Spezifikation R00020 „Befunde kopieren“, Kriterien 1–5 und 8 gegen Interactor, Endpunkt und das Programm als Prozess im Wegwerf-Repo:
/// die Kopie ist Byte für Byte das Ergebnis, das „Beenden“ auf stdout schreibt. Die Zwischenablage (Kriterien 6 und 7) prüft
/// <c>e2e/tests/ergebnis-kopieren.spec.js</c>; den Aufbau des Interactors prüfen <c>Beenden/ErgebnisKopierenInteractorTests</c>.
/// </summary>
[UnsupportedOSPlatform("windows")]
public class ErgebnisKopierenTests
{
    private const string Ueberschrift = "# Ergebnis manueller Review";
    private const string LeeresErgebnis = Ueberschrift + "\n\nKeine Anmerkungen.\n";
    private const string NichtEindeutig = "Diff nicht lesbar: Name nicht eindeutig";
    private const string NichtUebergebbar = "Diff nicht lesbar: Name nicht übergebbar";

    [Test]
    [Description("R00020 Kriterium 1")]
    public async Task Wenn_frischer_Lauf_ohne_Anmerkung_und_ohne_Haken_kopiert_dann_das_leere_Ergebnis_ohne_stdout_und_der_Lauf_laeuft_weiter()
    {
        using var repo = KopierRepo.K();
        await using var gr = await ErgebnisKopierenTreiber.StartenAsync(repo.Ordner, repo.Hash("k1"), repo.Hash("k2"));

        var kopie = await gr.KopiereAsync();

        Assert.That(kopie.Status, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(kopie.Ergebnis, Is.EqualTo(LeeresErgebnis));
        Assert.That(gr.Standardausgabe(), Is.Empty, "stdout bleibt bis „Beenden“ leer");
        Assert.That(gr.LaeuftNoch, Is.True, "die Kopie beendet den Lauf nicht");
        Assert.That(gr.Fehlerausgabe, Does.Not.Contain("Review beendet"));
    }

    [Test]
    [Description("R00020 Kriterium 2")]
    public async Task Wenn_Anmerkung_an_a_txt_2_in_k2_und_README_in_k1_abgehakt_dann_Kopie_das_Beispiel_und_stdout_nach_dem_Beenden_dieselbe_Kopie()
    {
        using var repo = KopierRepo.K();
        var k1 = repo.Hash("k1");
        var k2 = repo.Hash("k2");
        await using var gr = await ErgebnisKopierenTreiber.StartenAsync(repo.Ordner, k1, k2);

        var anmerkung = await gr.AnnotiereAsync(k2, "a.txt", 2, "Warum groß?");
        var haken = await gr.HakeAsync(k1, "README.md", abgehakt: true);
        var kopie = await gr.KopiereAsync();
        var beenden = await gr.BeendeAsync();
        var ende = await gr.WarteAufEndeAsync();

        var erwartet = string.Join("\n",
            Ueberschrift, "", "Anmerkungen: 1", "",
            "## 1. a.txt:2", "", $"Commit: {k2}", "", "> Warum groß?", "",
            "## Dateien", "", "Abgehakt: 1 von 3", "", $"- README.md (Commit {k1})", "",
            "Ungeprüft: 2 von 3", "", $"- a.txt (Commit {k1})", $"- a.txt (Commit {k2})") + "\n";
        Assert.That((anmerkung.Status, haken.Status, beenden.Status), Is.EqualTo((HttpStatusCode.Created, HttpStatusCode.OK, HttpStatusCode.OK)));
        Assert.That(kopie.Ergebnis, Is.EqualTo(erwartet));
        Assert.That(ende, Is.EqualTo(0));
        Assert.That(gr.Standardausgabe(), Is.EqualTo(Encoding.UTF8.GetBytes(erwartet)), "stdout nach dem Beenden ist Byte für Byte die Kopie");
    }

    [Test]
    [Description("R00020 Kriterium 3")]
    public async Task Wenn_zuerst_ohne_Anmerkungen_kopiert_danach_annotiert_und_erneut_kopiert_dann_nennt_die_zweite_Kopie_den_neuen_Stand_und_stdout_schreibt_dieselbe_Fassung()
    {
        using var repo = KopierRepo.K();
        var k1 = repo.Hash("k1");
        var k2 = repo.Hash("k2");
        await using var gr = await ErgebnisKopierenTreiber.StartenAsync(repo.Ordner, k1, k2);

        var ersteKopie = await gr.KopiereAsync();
        var anmerkung = await gr.AnnotiereAsync(k2, "a.txt", 2, "nach der Kopie");
        var haken = await gr.HakeAsync(k1, "a.txt", abgehakt: true);
        var zweiteKopie = await gr.KopiereAsync();
        await gr.BeendeAsync();
        var ende = await gr.WarteAufEndeAsync();

        Assert.That(ersteKopie.Ergebnis, Is.EqualTo(LeeresErgebnis));
        Assert.That((anmerkung.Status, haken.Status), Is.EqualTo((HttpStatusCode.Created, HttpStatusCode.OK)), "die Kopie siegelt weder Anmerkungen noch Haken");
        Assert.That(zweiteKopie.Ergebnis, Does.Contain("Anmerkungen: 1\n"));
        Assert.That(zweiteKopie.Ergebnis, Does.Contain("## 1. a.txt:2"));
        Assert.That(zweiteKopie.Ergebnis, Does.Contain("Abgehakt: 1 von 3\n"));
        Assert.That(ende, Is.EqualTo(0));
        Assert.That(gr.Standardausgabe(), Is.EqualTo(Encoding.UTF8.GetBytes(zweiteKopie.Ergebnis)));
    }

    [Test]
    [Description("R00020 Kriterium 4")]
    public async Task Wenn_Repo_N_mit_g_txt_abgehakt_kopiert_wird_dann_das_Ergebnis_aus_R00014_und_stdout_dieselbe_Kopie()
    {
        using var repo = FremdeNamenRepo.NMitV();
        var n = repo.Hash("n");
        var v = repo.Hash("v");
        await using var gr = await ErgebnisKopierenTreiber.StartenAsync(repo.Ordner, n, v);

        var haken = await gr.HakeAsync(n, "g.txt", abgehakt: true);
        var kopie = await gr.KopiereAsync();
        await gr.BeendeAsync();
        var ende = await gr.WarteAufEndeAsync();

        var erwartet = string.Join("\n",
            Ueberschrift, "", "Keine Anmerkungen.", "", "## Dateien", "", "Abgehakt: 1 von 10", "",
            $"- g.txt (Commit {n})", "", "Ungeprüft: 9 von 10", "",
            $"- a⟨0xFF⟩.sh (Commit {n})",
            $"- b⟨0xFF⟩.bin (Commit {n})",
            $"- f⟨0xFF⟩.txt (Commit {n}) — {NichtEindeutig}",
            $"- f⟨0xFF⟩.txt (Commit {n}) — {NichtEindeutig}",
            $"- in.txt (Commit {n})",
            $"- r⟨0xFF⟩.txt (Commit {n})",
            $"- t⟨0xFE⟩.txt (Commit {n})",
            $"- z⟨U+000A⟩⟨0xFF⟩.txt (Commit {n}) — {NichtUebergebbar}",
            $"- f⟨0xFF⟩.txt (Commit {v})") + "\n";
        Assert.That(haken.Status, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(kopie.Ergebnis, Is.EqualTo(erwartet));
        Assert.That(ende, Is.EqualTo(0));
        Assert.That(gr.Standardausgabe(), Is.EqualTo(Encoding.UTF8.GetBytes(erwartet)));
    }

    [Test]
    [Description("R00020 Kriterium 5")]
    public async Task Wenn_Repo_W_mit_fremdem_Namen_kopiert_wird_dann_Marken_statt_der_Zeichen_ohne_rohe_Steuerzeichen_und_stdout_dieselbe_Kopie()
    {
        using var repo = KopierRepo.W();
        var w = repo.Hash("w");
        await using var gr = await ErgebnisKopierenTreiber.StartenAsync(repo.Ordner, w);

        var anmerkung = await gr.AnnotiereAsync(w, KopierRepo.NameMitRichtungUndMarken, 1, "Text");
        var kopie = await gr.KopiereAsync();
        await gr.BeendeAsync();
        var ende = await gr.WarteAufEndeAsync();

        var roheSteuerzeichen = kopie.Ergebnis.Where(zeichen => char.IsControl(zeichen) && zeichen != '\n').ToArray();
        Assert.That(anmerkung.Status, Is.EqualTo(HttpStatusCode.Created));
        Assert.That(kopie.Ergebnis, Does.Contain("## 1. u⟨U+202E⟩⟨U+200B⟩⟨U+E0041⟩.txt:1"));
        Assert.That(kopie.Ergebnis.IndexOf('\u202E', StringComparison.Ordinal), Is.EqualTo(-1), "kein rohes U+202E");
        Assert.That(kopie.Ergebnis.IndexOf('\u200B', StringComparison.Ordinal), Is.EqualTo(-1), "kein rohes U+200B");
        Assert.That(kopie.Ergebnis.IndexOf("\U000E0041", StringComparison.Ordinal), Is.EqualTo(-1), "kein rohes U+E0041");
        Assert.That(roheSteuerzeichen, Is.Empty);
        Assert.That(ende, Is.EqualTo(0));
        Assert.That(gr.Standardausgabe(), Is.EqualTo(Encoding.UTF8.GetBytes(kopie.Ergebnis)));
    }

    [Test]
    [Description("R00020 Kriterium 8")]
    public async Task Wenn_fremder_Host_Post_und_zwei_GET_abgefragt_werden_dann_403_bzw_405_derselbe_Text_ohne_CORS_und_ohne_Zustandswechsel()
    {
        using var repo = KopierRepo.K();
        var k2 = repo.Hash("k2");
        await using var gr = await ErgebnisKopierenTreiber.StartenAsync(repo.Ordner, repo.Hash("k1"), k2);
        await gr.AnnotiereAsync(k2, "a.txt", 2, "vorhanden");

        var fremderHost = await gr.KopiereAsync(host: "fremd.example");
        var perPost = await gr.KopiereAsync(methode: "POST");
        var erste = await gr.KopiereAsync();
        var zweite = await gr.KopiereAsync();
        var nachzuegler = await gr.AnnotiereAsync(k2, "a.txt", 1, "nach der Kopie");
        var dritte = await gr.KopiereAsync();

        Assert.That(fremderHost.Status, Is.EqualTo(HttpStatusCode.Forbidden));
        Assert.That(perPost.Status, Is.EqualTo(HttpStatusCode.MethodNotAllowed));
        Assert.That(zweite.Ergebnis, Is.EqualTo(erste.Ergebnis));
        Assert.That(erste.HatCorsKopf, Is.False);
        Assert.That(erste.OhneZwischenspeicher, Is.True);
        Assert.That(nachzuegler.Status, Is.EqualTo(HttpStatusCode.Created), "die Kopie siegelt nichts");
        Assert.That(dritte.Ergebnis, Does.Contain("Anmerkungen: 2\n"));
        Assert.That(gr.Standardausgabe(), Is.Empty, "die Schnittstelle schreibt nichts auf stdout");
        Assert.That(gr.LaeuftNoch, Is.True);
    }
}