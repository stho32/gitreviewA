using System.Net;
using System.Runtime.Versioning;
using System.Text;
using GitReviewA.Git;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Spezifikation R00036 „Art der Anmerkung“ gegen den Interactor und das Programm als Prozess: Kriterium 1 (drei Arten und ohne am
/// Ergebnis), Kriterium 2 (leere erste Zeile, Bereichszitat), Kriterium 3 (ohne Art Byte für Byte wie R00002), die Integrationsteile
/// von Kriterium 4 und 5 sowie die Log-Zusage (die Debug-Zeile nennt die Art, nie den Text). Die Operation selbst prüfen
/// <c>Anmerkungen/AnmerkungsartTests</c>, die Anzeige <c>e2e/tests/art-der-anmerkung.spec.js</c>.
/// </summary>
[UnsupportedOSPlatform("windows")]
public class ArtDerAnmerkungTests
{
    private const string Ueberschrift = "# Ergebnis manueller Review";

    [Test]
    [Description("R00036 Kriterium 1: Frage, Muss und ohne Art stehen unter unveränderten Überschriften auf stdout, Exit 0")]
    public async Task Wenn_drei_Anmerkungen_mit_und_ohne_Art_beendet_werden_dann_stehen_die_Praefixe_auf_stdout_und_die_Ueberschriften_bleiben()
    {
        using var repo = ZusammenRepo.Z();
        var z1 = repo.Hash("z1");
        var z3 = repo.Hash("z3");
        await using var gr = await ErgebnisKopierenTreiber.StartenAsync(repo.Ordner, z1, repo.Hash("z2"), z3);

        var frage = await gr.AnnotiereMitArtAsync(z3, "src/a.txt", 2, "ZWEI groß?", "frage");
        var muss = await gr.AnnotiereMitArtAsync(z3, "src/b.txt", null, "Datei fehlt im Index", "muss");
        var ohne = await gr.AnnotiereAsync(z1, "README.md", 1, "Titel kürzen");
        await gr.BeendeAsync();
        var ende = await gr.WarteAufEndeAsync();

        var erwartet = string.Join("\n",
            Ueberschrift, "", "Anmerkungen: 3", "",
            "## 1. src/a.txt:2", "", $"Commit: {z3}", "", "> [Frage] ZWEI groß?", "",
            "## 2. src/b.txt (ganze Datei)", "", $"Commit: {z3}", "", "> [Muss] Datei fehlt im Index", "",
            "## 3. README.md:1", "", $"Commit: {z1}", "", "> Titel kürzen") + "\n";
        Assert.That((frage.Status, muss.Status, ohne.Status), Is.EqualTo((HttpStatusCode.Created, HttpStatusCode.Created, HttpStatusCode.Created)));
        Assert.That(ende, Is.Zero);
        Assert.That(gr.Standardausgabe(), Is.EqualTo(Encoding.UTF8.GetBytes(erwartet)), "stdout ist genau dieses Ergebnis");
    }

    [Test]
    [Description("R00036 Kriterium 2: leere erste Textzeile `> [Idee]` ohne Leerzeichen; das Zitat der Bereichszeilen bleibt unverändert")]
    public async Task Wenn_die_erste_Zeile_leer_ist_und_ein_Bereich_eine_Art_traegt_dann_stehen_die_Praefixe_richtig()
    {
        using var repo = DiffRepo.Zeilenbereich();
        var r2 = repo.Hash("r2");
        await using var gr = await ErgebnisKopierenTreiber.StartenAsync(repo.Ordner, r2);

        var leer = await gr.AnnotiereMitArtAsync(r2, "lang.txt", 1, "\nzweite Zeile", "idee");
        var bereich = await gr.AnnotiereMitArtAsync(r2, "lang.txt", null, "Schleife doppelt", "muss", von: 3, bis: 7);
        await gr.BeendeAsync();
        var ende = await gr.WarteAufEndeAsync();

        var zitat = string.Join("\n", "    3: z03", "    4: z04", "    5: Z05", "    6: z06", "    7: z07");
        var erwartet = string.Join("\n",
            Ueberschrift, "", "Anmerkungen: 2", "",
            "## 1. lang.txt:1", "", $"Commit: {r2}", "", "> [Idee]", "> zweite Zeile", "",
            "## 2. lang.txt:3-7", "", $"Commit: {r2}", "", zitat, "", "> [Muss] Schleife doppelt") + "\n";
        Assert.That((leer.Status, bereich.Status), Is.EqualTo((HttpStatusCode.Created, HttpStatusCode.Created)));
        Assert.That(ende, Is.Zero);
        Assert.That(gr.StandardausgabeAlsText(), Is.EqualTo(erwartet));
    }

    [Test]
    [Description("R00036 Kriterium 3: ohne Art Byte für Byte wie R00002 — auch ausdrücklich `null` ändert nichts")]
    public async Task Wenn_zwei_Anmerkungen_ohne_Art_beendet_werden_dann_ist_stdout_Byte_fuer_Byte_das_Ergebnis_vor_dieser_Anforderung()
    {
        using var repo = ZusammenRepo.Z();
        var z3 = repo.Hash("z3");
        await using var gr = await ErgebnisKopierenTreiber.StartenAsync(repo.Ordner, repo.Hash("z1"), repo.Hash("z2"), z3);

        var erste = await gr.AnnotiereAsync(z3, "src/a.txt", 2, "Warum groß?");
        var zweite = await gr.AnnotiereMitArtAsync(z3, "src/b.txt", null, "Datei fehlt", null);
        await gr.BeendeAsync();
        var ende = await gr.WarteAufEndeAsync();

        var erwartet = string.Join("\n",
            Ueberschrift, "", "Anmerkungen: 2", "",
            "## 1. src/a.txt:2", "", $"Commit: {z3}", "", "> Warum groß?", "",
            "## 2. src/b.txt (ganze Datei)", "", $"Commit: {z3}", "", "> Datei fehlt") + "\n";
        Assert.That((erste.Status, zweite.Status), Is.EqualTo((HttpStatusCode.Created, HttpStatusCode.Created)));
        Assert.That(ende, Is.Zero);
        Assert.That(gr.Standardausgabe(), Is.EqualTo(Encoding.UTF8.GetBytes(erwartet)), "kein Präfix, keine zusätzliche Zeile, kein anderes Byte");
    }

    [Test]
    [Description("R00036 Kriterium 4 (Interactor): die drei Werte kommen an, ein unbekannter Wert legt nichts an")]
    public void Wenn_mit_muss_frage_idee_angelegt_wird_dann_tragen_die_Anmerkungen_die_Art()
    {
        using var repo = DiffRepo.A();
        var gr = ZeileAnnotierenSprache.Aufruf(repo, ["q", "p"]);

        var muss = gr.AnnotiereMitArt("q", "lang.txt", 1, "eins", "muss");
        var frage = gr.AnnotiereMitArt("q", "lang.txt", 2, "zwei", "frage");
        var idee = gr.AnnotiereMitArt("q", "lang.txt", 3, "drei", "idee");

        Assert.That((muss.Ausgang, frage.Ausgang, idee.Ausgang), Is.EqualTo(("angelegt", "angelegt", "angelegt")));
        Assert.That(gr.Anmerkungen(), Is.EqualTo(new[]
        {
            gr.AnmerkungMitArt(1, "q", "lang.txt", 1, "eins", "muss"),
            gr.AnmerkungMitArt(2, "q", "lang.txt", 2, "zwei", "frage"),
            gr.AnmerkungMitArt(3, "q", "lang.txt", 3, "drei", "idee"),
        }));
    }

    [TestCase("\"MUSS\"")]
    [TestCase("\"muss \"")]
    [TestCase("\"\"")]
    [TestCase("7")]
    [TestCase("true")]
    [Description("R00036 Kriterium 4 (Interactor): „Art unbekannt“, nichts angelegt, keine Nummer verbraucht")]
    public void Wenn_die_Art_unbekannt_dann_abgelehnt_und_die_naechste_bekommt_Nummer_1(string roh)
    {
        using var repo = DiffRepo.A();
        var gr = ZeileAnnotierenSprache.Aufruf(repo, ["q", "p"]);

        var abgelehnt = gr.AnnotiereMitRohart("q", "lang.txt", 1, "t", roh);
        var gueltig = gr.AnnotiereMitArt("q", "lang.txt", 1, "t", "muss");

        Assert.That((abgelehnt.Ausgang, abgelehnt.Grund), Is.EqualTo(("ungültig", "Art unbekannt")));
        Assert.That((gueltig.Ausgang, gueltig.Nummer), Is.EqualTo(("angelegt", 1)));
        Assert.That(gr.Anmerkungen(), Is.EqualTo(new[] { gr.AnmerkungMitArt(1, "q", "lang.txt", 1, "t", "muss") }));
    }

    [Test]
    [Description("R00036 Kriterium 5 (Interactor): Muss → Frage → ohne wechselt nur das Präfix; Nummer, Stelle und Position bleiben")]
    public void Wenn_die_Art_ueber_die_Nummer_gewechselt_und_entfernt_wird_dann_folgt_das_Ergebnis_und_die_Position_bleibt()
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungAendernSprache.Aufruf(repo, ["q", "p"]);
        gr.LegeAnMitArt("q", "lang.txt", 18, "Klammer fehlt", "muss");
        gr.LegeAn("q", "src/b.txt", 2, "zweite");

        var alsMuss = gr.Ergebnis();
        gr.AendereMitArt(1, "Klammer fehlt", "frage");
        var alsFrage = gr.Ergebnis();
        gr.AendereOhneArt(1, "Klammer fehlt");
        var ohneArt = gr.Ergebnis();

        Assert.That(alsMuss, Does.Contain("> [Muss] Klammer fehlt\n"));
        Assert.That(alsFrage, Does.Contain("> [Frage] Klammer fehlt\n"));
        Assert.That(ohneArt, Does.Contain("> Klammer fehlt\n").And.Not.Contain("[Frage]"));
        var ergebnisse = new[] { alsMuss, alsFrage, ohneArt };
        Assert.That(ergebnisse, Has.All.Contain("## 1. lang.txt:18"), "Position 1 bleibt");
        Assert.That(ergebnisse, Has.All.Contain("## 2. src/b.txt:2"), "Position 2 bleibt");
    }

    [Test]
    [Description("R00036 NFA Logging: die Debug-Zeile nennt die Art als Wert, nie den Text — beim Anlegen und beim Ändern")]
    public void Wenn_mit_Art_angelegt_und_geaendert_wird_dann_nennt_die_Debug_Zeile_art_aber_nie_den_Text()
    {
        using var repo = DiffRepo.A();
        var gr = AnmerkungAendernSprache.Aufruf(repo, ["q", "p"]);

        gr.LegeAnMitArt("q", "lang.txt", 18, "GEHEIMWORT eins", "muss");
        gr.AendereMitArt(1, "GEHEIMWORT zwei", "frage");

        var zeilen = gr.Protokollzeilen();
        Assert.That(zeilen, Has.Exactly(1).Contains("Nummer 1 angelegt (Textlänge 15, art=muss)"));
        Assert.That(zeilen, Has.Exactly(1).Contains("Nummer 1 geändert (Textlänge 15, art=frage)"));
        Assert.That(gr.Protokoll(), Does.Not.Contain("GEHEIMWORT"));
    }
}