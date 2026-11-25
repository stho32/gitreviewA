using System.Net;
using System.Runtime.Versioning;
using GitReviewA.Aufruf;
using GitReviewA.Dateien;
using GitReviewA.Diff;
using GitReviewA.Git;
using GitReviewA.Protokoll;
using GitReviewA.Server;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Spezifikation R00026 „Leerraum ausblenden und Lücken aufklappen“, Teil Integration gegen den <see cref="DiffLesenInteractor"/>
/// mit echtem `git` in Repo W: die Leerraum-Stellung (`-w`), die Nummern gegen das Orakel `git show` und die Zeilen der Lücken,
/// die „ganze Datei“ liefert. Das Aufklappen selbst zeichnet die Oberfläche (e2e/tests/leerraum-und-luecken.spec.js), die
/// Lücken-Rechnung steht in e2e/tests/bausteine/luecken-werte.spec.js.
/// </summary>
[UnsupportedOSPlatform("windows")]
public class LeerraumUndLueckenTests
{
    private static readonly string[] SiebenZeilen = ["eins", "zwei", "drei", "  zwei", "drei geaendert", "vier", ""];
    private static readonly string[] SechsZeilen = ["eins", "  zwei", "drei", "drei geaendert", "vier", ""];

    [Test]
    public void Wenn_Leerraum_beachtet_dann_sieben_Zeilen_und_mit_ignorieren_sechs()
    {
        using var repo = DiffRepo.W();
        var sprache = DiffLesenSprache(repo);

        var beachten = sprache.Lesen(repo.Hash("w2"), "leerraum.txt", Diffumfang.Aenderungen, Leerraum.Beachten);
        var ignorieren = sprache.Lesen(repo.Hash("w2"), "leerraum.txt", Diffumfang.Aenderungen, Leerraum.Ignorieren);

        Assert.That(beachten.Abschnittskoepfe, Is.EqualTo(new[] { "@@ -1,4 +1,5 @@" }));
        Assert.That(beachten.Zeilen, Is.EqualTo(new[] { " eins", "-zwei", "-drei", "+  zwei", "+drei geaendert", " vier", "+" }));
        Assert.That(ignorieren.Zeilen, Is.EqualTo(new[] { " eins", "   zwei", "-drei", "+drei geaendert", " vier", "+" }));
        Assert.That(TextOhneVorzeichen(beachten.Zeilen), Is.EqualTo(SiebenZeilen));
        Assert.That(TextOhneVorzeichen(ignorieren.Zeilen), Is.EqualTo(SechsZeilen));
    }

    [Test]
    public void Wenn_Leerraum_ignoriert_dann_tragen_die_Zeilen_dieselben_Nummern_wie_der_Stand()
    {
        using var repo = DiffRepo.W();
        var sprache = DiffLesenSprache(repo);

        foreach (var stellung in new[] { Leerraum.Beachten, Leerraum.Ignorieren })
        {
            var diff = sprache.Lesen(repo.Hash("w2"), "leerraum.txt", Diffumfang.Aenderungen, stellung);
            Assert.That(diff.TexteMitNummerNeu(), Is.EqualTo(new[] { "eins", "  zwei", "drei geaendert", "vier", "" }),
                "Nummer neu n trägt Zeile n von git show w2:leerraum.txt (die leere Zeile 5 schneidet git show am Zeilenende ab)");
        }
        var beachten = sprache.Lesen(repo.Hash("w2"), "leerraum.txt", Diffumfang.Aenderungen, Leerraum.Beachten);
        var ignorieren = sprache.Lesen(repo.Hash("w2"), "leerraum.txt", Diffumfang.Aenderungen, Leerraum.Ignorieren);
        Assert.That(beachten.TexteMitNummerAlt(), Is.EqualTo(new[] { "eins", "zwei", "drei", "vier" }));
        Assert.That(ignorieren.TexteMitNummerAlt(), Is.EqualTo(new[] { "eins", "  zwei", "drei", "vier" }),
            "mit -w druckt git die übergangene Zeile einmal als Kontext — ihre Nummer alt bleibt 2, wie in der Stellung „beachten“");
        Assert.That(ZeileVon(repo, "w1", "leerraum.txt", 3), Is.EqualTo("drei"));
        Assert.That(ZeileVon(repo, "w2", "leerraum.txt", 3), Is.EqualTo("drei geaendert"));
    }

    [Test]
    public void Wenn_ganze_Datei_mit_ignorieren_dann_die_Zeilen_des_Standes_mit_denselben_Nummern()
    {
        using var repo = DiffRepo.W();
        var sprache = DiffLesenSprache(repo);

        var ganz = sprache.Lesen(repo.Hash("w2"), "leerraum.txt", Diffumfang.Ganz, Leerraum.Ignorieren);

        Assert.That(ganz.Abschnittskoepfe, Is.EqualTo(new[] { "@@ -1,4 +1,5 @@" }));
        Assert.That(ganz.Zeilen, Is.EqualTo(new[] { " eins", "   zwei", "-drei", "+drei geaendert", " vier", "+" }));
        Assert.That(ganz.TexteMitNummerNeu(), Is.EqualTo(new[] { "eins", "  zwei", "drei geaendert", "vier", "" }));
        Assert.That(ganz.Zeilen[1][1..], Is.EqualTo("  zwei"), "die Einrückung ist dort wie in „nur Änderungen“ eine Kontextzeile derselben Nummern");
    }

    [Test]
    public void Wenn_weit_txt_nur_Aenderungen_dann_zwei_Abschnitte_und_die_Zeilen_der_Luecken_fehlten()
    {
        using var repo = DiffRepo.W();
        var sprache = DiffLesenSprache(repo);

        var aenderungen = sprache.Lesen(repo.Hash("w2"), "weit.txt", Diffumfang.Aenderungen, Leerraum.Beachten);
        var ganz = sprache.Lesen(repo.Hash("w2"), "weit.txt", Diffumfang.Ganz, Leerraum.Beachten);

        Assert.That(aenderungen.Abschnittskoepfe, Is.EqualTo(new[] { "@@ -2,7 +2,7 @@ z01", "@@ -32,7 +32,7 @@ z31" }),
            "git hängt den Text der Zeile vor dem Abschnitt als Überschrift an; die Lücke davor kennt die Ansicht aus dem Abschnittskopf (R00026)");
        Assert.That(aenderungen.Zeilen.Any(zeile => zeile.Contains("z09", StringComparison.Ordinal)), Is.False);
        Assert.That(aenderungen.Zeilen.Any(zeile => zeile.Contains("z31", StringComparison.Ordinal)), Is.False);
        Assert.That(aenderungen.Zeilen.Any(zeile => zeile.Contains("z39", StringComparison.Ordinal)), Is.False);
        Assert.That(ganz.Zeilen, Has.Length.EqualTo(60 + 2), "die ganze Datei: 60 Kontextzeilen der neuen Seite, zwei entfernte und zwei hinzugefügte");
        Assert.That(ganz.TexteMitNummerNeu(), Is.EqualTo(ZeilenVon(repo, "w2", "weit.txt")), "Orakel: Nummer neu n trägt Zeile n von git show w2:weit.txt");
        Assert.That(ZeileVon(repo, "w2", "weit.txt", 20), Is.EqualTo("<b>z20</b>"));
        Assert.That(ZeileVon(repo, "w2", "weit.txt", 21), Is.EqualTo("a\u202Eb"));
    }

    [Test]
    public async Task Wenn_das_Objekt_von_w2_entfernt_ist_dann_nicht_lesbar_und_w1_bleibt_lesbar()
    {
        using var repo = DiffRepo.W();
        var sprache = DiffLesenSprache(repo);
        var w1Vorher = sprache.Lesen(repo.Hash("w1"), "weit.txt", Diffumfang.Aenderungen, Leerraum.Beachten);

        EntferneObjekt(repo, "w2");

        var entfernt = sprache.Lesen(repo.Hash("w2"), "weit.txt", Diffumfang.Aenderungen, Leerraum.Beachten);
        var danachW1 = sprache.Lesen(repo.Hash("w1"), "weit.txt", Diffumfang.Aenderungen, Leerraum.Beachten);

        Assert.That(entfernt.Ausgang, Is.EqualTo("nicht lesbar"));
        Assert.That(entfernt.Zeilen, Is.Empty);
        Assert.That(w1Vorher.Ausgang, Is.EqualTo("gelesen"));
        Assert.That(danachW1.Zeilen, Is.EqualTo(w1Vorher.Zeilen));
    }

    [Test]
    public async Task Wenn_der_Endpunkt_mit_ignoriertem_Leerraum_anfragt_dann_sechs_Zeilen_und_unbekannte_Werte_400()
    {
        using var repo = DiffRepo.W();
        var commits = GitLeser.Lesen(new CommitHashes([repo.Hash("w1"), repo.Hash("w2")]), repo.Ordner);
        var protokoll = new StderrProtokoll(new StringWriter(), TimeProvider.System, Protokollstufe.Warnung);
        await using var server = await Webserver.StartenAsync(0, commits, new GitDateiquelle(repo.Ordner), new GitDiffquelle(repo.Ordner), TestUebersichtsquelle.Leer(), TestZusammenquelle.Leer(), Oberflaeche.AusDemProgramm(), protokoll);
        using var client = new HttpClient();

        var ignorieren = await client.GetStringAsync(DiffAdresse(server, repo.Hash("w2"), "leerraum.txt", "&leerraum=ignorieren"));
        var ohneAngabe = await client.GetStringAsync(DiffAdresse(server, repo.Hash("w2"), "leerraum.txt"));
        var unbekannt = await client.GetAsync(DiffAdresse(server, repo.Hash("w2"), "leerraum.txt", "&leerraum=egal"));
        var nichtDa = await client.GetAsync(DiffAdresse(server, repo.Hash("w2"), "nicht-da.txt"));
        var kurzHash = await client.GetAsync(DiffAdresse(server, repo.Hash("w2")[..7], "leerraum.txt"));
        var head = await client.GetAsync(DiffAdresse(server, "HEAD", "leerraum.txt"));

        Assert.That(Zeilenzahl(ignorieren), Is.EqualTo(6), ignorieren);
        Assert.That(Zeilenzahl(ohneAngabe), Is.EqualTo(7), ohneAngabe);
        Assert.That(unbekannt.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
        Assert.That(nichtDa.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
        Assert.That(kurzHash.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
        Assert.That(head.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
    }

    [Test]
    public void Wenn_nur_der_Leerraum_sich_aendert_dann_ist_der_Patch_mit_ignorieren_leer_und_bleibt_gelesen()
    {
        using var repo = WegwerfRepo.MitCommits();
        repo.SchreibeDatei("still.txt", "a\nb\n");
        var s1 = repo.Committe("s1", "Anna Beispiel", "2026-03-04T09:15:00+01:00", "");
        repo.SchreibeDatei("still.txt", "a\n  b\n");
        var s2 = repo.Committe("s2", "Anna Beispiel", "2026-03-04T09:15:00+01:00", "");
        var treiber = DiffLesenTreiber.Starten(repo.Ordner, [s1, s2]);

        var beachten = treiber.Lesen(s2, "still.txt", ganzeDatei: false, alsText: false, Leerraum.Beachten);
        var ignorieren = treiber.Lesen(s2, "still.txt", ganzeDatei: false, alsText: false, Leerraum.Ignorieren);

        Assert.That(beachten.Zeilen, Is.EqualTo(new[] { " a", "-b", "+  b" }));
        Assert.That(ignorieren.Ausgang, Is.EqualTo("gelesen"), "die Zeilenzahl der Dateiliste zählt ohne -w; mit „ignorieren“ prüft die Zählung nicht (R00026)");
        Assert.That(ignorieren.Zeilen, Is.Empty);
    }

    [Test]
    public void Wenn_eine_Anmerkung_an_drei_geaendert_haengt_dann_bleibt_sie_beim_Umschalten_des_Leerraums_an_Zeile_3_und_im_Ergebnis()
    {
        using var repo = DiffRepo.W();
        var annotieren = ZeileAnnotierenSprache.Aufruf(repo, ["w1", "w2"]);
        var sprache = DiffLesenSprache(repo);

        var angelegt = annotieren.Annotiere("w2", "leerraum.txt", 3, "drei geaendert");

        var ignorieren = sprache.Lesen(repo.Hash("w2"), "leerraum.txt", Diffumfang.Aenderungen, Leerraum.Ignorieren);
        var zurueck = sprache.Lesen(repo.Hash("w2"), "leerraum.txt", Diffumfang.Aenderungen, Leerraum.Beachten);
        var ergebnis = annotieren.Beenden();

        Assert.That(angelegt, Is.EqualTo(new Anlegeantwort("angelegt", 1, "")));
        Assert.That(ignorieren.TexteMitNummerNeu()[2], Is.EqualTo("drei geaendert"), "die Anmerkung hängt an der Nummer neu 3");
        Assert.That(zurueck.TexteMitNummerNeu()[2], Is.EqualTo("drei geaendert"));
        Assert.That(ergebnis, Is.EqualTo("# Ergebnis manueller Review\n\nAnmerkungen: 1\n\n" + annotieren.Ergebnisabschnitt(1, "leerraum.txt:3", "w2", "> drei geaendert")));
    }

    private static DiffSprache DiffLesenSprache(DiffRepo repo)
    {
        var treiber = DiffLesenTreiber.Starten(repo.Ordner, [repo.Hash("w1"), repo.Hash("w2")]);
        return new DiffSprache(treiber);
    }

    private static string[] TextOhneVorzeichen(string[] zeilen)
    {
        return zeilen.Select(zeile => zeile.Length > 0 ? zeile[1..] : zeile).ToArray();
    }

    private static int Zeilenzahl(string json)
    {
        using var dokument = System.Text.Json.JsonDocument.Parse(json);
        var patch = dokument.RootElement.GetProperty("patch").GetString()!;
        return patch.Split('\n').Count(zeile => zeile.Length > 0 && (zeile[0] == ' ' || zeile[0] == '+' || zeile[0] == '-'));
    }

    private static Uri DiffAdresse(Webserver server, string hash, string pfad, string zusatz = "")
    {
        return new Uri(new Uri(server.Adresse), $"api/commits/{Uri.EscapeDataString(hash)}/diff?pfad={Uri.EscapeDataString(pfad)}{zusatz}");
    }

    private static string ZeileVon(DiffRepo repo, string commit, string pfad, int nummer)
    {
        return ZeilenVon(repo, commit, pfad)[nummer - 1];
    }

    private static string[] ZeilenVon(DiffRepo repo, string commit, string pfad)
    {
        var inhalt = repo.Git("show", $"{repo.Hash(commit)}:{pfad}");
        if (inhalt.EndsWith('\n'))
        {
            inhalt = inhalt[..^1];
        }
        return inhalt.Split('\n');
    }

    private static void EntferneObjekt(DiffRepo repo, string commit)
    {
        var hash = repo.Hash(commit);
        File.Delete(Path.Combine(repo.Ordner, ".git", "objects", hash[..2], hash[2..]));
    }

    /// <summary>Treiber in-process auf den Interactor, mit der Leerraum-Stellung als Parameter.</summary>
    private sealed class DiffSprache(DiffLesenTreiber treiber)
    {
        public Dateiansicht Lesen(string hash, string pfad, Diffumfang umfang, Leerraum leerraum)
        {
            return treiber.Lesen(hash, pfad, umfang == Diffumfang.Ganz, alsText: false, leerraum);
        }
    }
}
