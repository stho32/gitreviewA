using GitReviewA.Anmerkungen;
using GitReviewA.Aufruf;
using GitReviewA.Beenden;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Protokoll;
using GitReviewA.Tests.Akzeptanz;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Beenden;

/// <summary>
/// Spezifikation R00020 „Befunde kopieren“ auf Ebene des Interactors: derselbe Text wie stdout, ohne Anmerkungen, mit Anmerkungen,
/// mit Haken, mit gesperrter Stelle — und ohne Siegel. Den Weg über Endpunkt und Programm prüft <c>Akzeptanz/ErgebnisKopierenTests</c>.
/// </summary>
[System.Runtime.Versioning.UnsupportedOSPlatform("windows")]
public class ErgebnisKopierenInteractorTests
{
    private const string HashA = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";
    private const string HashB = "b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5";

    [Test]
    public void Wenn_nichts_annotiert_und_nichts_abgehakt_dann_genau_das_leere_Ergebnis_aus_R00002()
    {
        var gr = Aufbau.MitLesbarerUebersicht(HashA, "a.txt");

        var antwort = gr.Kopiere();

        Assert.That(antwort.Ergebnis, Is.EqualTo("# Ergebnis manueller Review\n\nKeine Anmerkungen.\n"));
    }

    [Test]
    public void Wenn_zwei_Anmerkungen_dann_nummeriert_nach_Position_mit_vollem_Hash_und_Zitat()
    {
        var gr = Aufbau.MitLesbarerUebersicht(HashA, "a.txt");
        gr.Annotiere(HashA, "a.txt", 2, "Warum groß?");
        gr.Annotiere(HashB, "b.txt", null, "Zweite");

        var antwort = gr.Kopiere();

        Assert.That(antwort.Ergebnis, Is.EqualTo(string.Join("\n",
            "# Ergebnis manueller Review", "", "Anmerkungen: 2", "",
            "## 1. a.txt:2", "", $"Commit: {HashA}", "", "> Warum groß?", "",
            "## 2. b.txt (ganze Datei)", "", $"Commit: {HashB}", "", "> Zweite") + "\n"));
    }

    [Test]
    public void Wenn_ein_Haken_gesetzt_dann_Abschnitt_Dateien_ab_dem_ersten_Haken_mit_Stand()
    {
        var gr = Aufbau.MitLesbarerUebersicht(HashA, "README.md", "a.txt");
        gr.Hake(HashA, "README.md", abgehakt: true);

        var antwort = gr.Kopiere();

        Assert.That(antwort.Ergebnis, Is.EqualTo(string.Join("\n",
            "# Ergebnis manueller Review", "", "Keine Anmerkungen.", "", "## Dateien", "", "Abgehakt: 1 von 2", "",
            $"- README.md (Commit {HashA})", "", "Ungeprüft: 1 von 2", "", $"- a.txt (Commit {HashA})") + "\n"));
    }

    [Test]
    public void Wenn_eine_Stelle_gesperrt_dann_steht_ihr_Sperrgrund_woertlich_in_der_Zeile()
    {
        var gr = Aufbau.MitSperre(HashA, "g.txt", "Diff nicht lesbar: Name nicht eindeutig", "a.txt");
        gr.Hake(HashA, "a.txt", abgehakt: true);

        var antwort = gr.Kopiere();

        Assert.That(antwort.Ergebnis, Does.Contain($"- g.txt (Commit {HashA}) — Diff nicht lesbar: Name nicht eindeutig"));
    }

    [Test]
    [Description("R00031 Kriterium 11 und 12: zwei Bereiche derselben Datei mit Zitat und ein Lesevorgang je (Commit, Datei)")]
    public void Wenn_zwei_Bereiche_in_derselben_Datei_dann_beide_mit_Zitat_und_ein_Lesevorgang()
    {
        using var repo = DiffRepo.A();
        var gr = Aufbau.MitBereichszeilen(repo, "q");
        gr.AnnotiereBereich(repo.Hash("q"), "lang.txt", 1, 3, "erster");
        gr.AnnotiereBereich(repo.Hash("q"), "lang.txt", 2, 4, "zweiter");

        var antwort = gr.Kopiere();

        Assert.That(antwort.Ergebnis, Is.EqualTo(string.Join("\n",
            "# Ergebnis manueller Review", "", "Anmerkungen: 2", "",
            "## 1. lang.txt:1-3", "", $"Commit: {repo.Hash("q")}", "", "    1: z01\n    2: z02\n    3: Z03", "", "> erster", "",
            "## 2. lang.txt:2-4", "", $"Commit: {repo.Hash("q")}", "", "    2: z02\n    3: Z03\n    4: z04", "", "> zweiter") + "\n"));
        Assert.That(gr.Lesevorgaenge(), Is.EqualTo(1), "je (Commit, Datei) höchstens einmal gelesen");
    }

    [Test]
    [Description("R00031 Kriterium 12: ist der Bereich nicht lesbar, bleibt der Abschnitt bei Stelle und Text; der Grund steht auf stderr")]
    public void Wenn_der_Bereich_nicht_lesbar_ist_dann_ohne_Zitat_und_mit_Grund_auf_stderr()
    {
        using var repo = DiffRepo.A();
        var gr = Aufbau.MitBereichszeilen(repo, "q");
        gr.AnnotiereBereich(repo.Hash("q"), "gibtsnicht.txt", 1, 2, "Text");

        var antwort = gr.Kopiere();

        Assert.That(antwort.Ergebnis, Is.EqualTo(string.Join("\n",
            "# Ergebnis manueller Review", "", "Anmerkungen: 1", "",
            "## 1. gibtsnicht.txt:1-2", "", $"Commit: {repo.Hash("q")}", "", "> Text") + "\n"));
        Assert.That(gr.Protokoll, Does.Contain("gibtsnicht.txt"));
        Assert.That(gr.Protokoll, Does.Contain("nicht gefunden"));
    }

    [Test]
    public void Wenn_kopiert_und_danach_annotiert_dann_ist_nichts_gesiegelt_und_die_naechste_Kopie_nennt_die_Anmerkung()
    {
        var gr = Aufbau.MitLesbarerUebersicht(HashA, "a.txt");
        var ersteKopie = gr.Kopiere();
        gr.Annotiere(HashA, "a.txt", 1, "nach der Kopie");

        var zweiteKopie = gr.Kopiere();

        Assert.That(ersteKopie.Ergebnis, Is.EqualTo("# Ergebnis manueller Review\n\nKeine Anmerkungen.\n"));
        Assert.That(zweiteKopie.Ergebnis, Does.Contain("Anmerkungen: 1\n"));
        Assert.That(zweiteKopie.Ergebnis, Does.Contain("## 1. a.txt:1"));
        Assert.That(gr.IstAbgeschlossen, Is.False);
    }

    private sealed class Aufbau
    {
        private readonly Anmerkungsspeicher anmerkungen = new();
        private readonly Hakenspeicher haken = new();
        private readonly StringWriter protokollziel = new();
        private readonly DateiAbhakenInteractor dateiAbhaken;
        private readonly ErgebnisKopierenInteractor interactor;

        private Aufbau(IUebersichtsquelle uebersichtsquelle, string? arbeitsordner = null)
        {
            var protokoll = new StderrProtokoll(protokollziel, TimeProvider.System, Protokollstufe.Debug);
            var gemerkt = new GemerkteUebersicht(uebersichtsquelle);
            dateiAbhaken = new DateiAbhakenInteractor(gemerkt, haken, TestNettoDateiliste.Leer(), protokoll);
            var bereichszeilen = arbeitsordner is null ? null : new Bereichszeilen(gemerkt, arbeitsordner, Ausgabegrenze.Standard, protokoll);
            interactor = new ErgebnisKopierenInteractor(anmerkungen, dateiAbhaken, bereichszeilen);
        }

        public bool IstAbgeschlossen => anmerkungen.IstAbgeschlossen;

        public string Protokoll => protokollziel.ToString();

        /// <summary>Der Aufbau mit echtem git: die Übersicht und der Lesepfad der markierten Zeilen lesen im Wegwerf-Repo.</summary>
        public static Aufbau MitBereichszeilen(DiffRepo repo, string commit)
        {
            var commits = GitLeser.Lesen(new CommitHashes([repo.Hash(commit)]), repo.Ordner);
            var arbeitsordner = GitLeser.WurzelLesen(repo.Ordner);
            return new Aufbau(new GitUebersichtsquelle(commits, arbeitsordner), arbeitsordner);
        }

        public static Aufbau MitLesbarerUebersicht(string hash, params string[] pfade)
        {
            return new Aufbau(TestUebersichtsquelle.Mit(hash, pfade));
        }

        public static Aufbau MitSperre(string hash, string gesperrterPfad, string sperrgrund, string lesbarerPfad)
        {
            return new Aufbau(TestUebersichtsquelle.MitSperre(hash, gesperrterPfad, sperrgrund, lesbarerPfad));
        }

        public void Annotiere(string commit, string datei, int? zeile, string text)
        {
            var angelegt = anmerkungen.VersucheAnzuhaengen(new GepruefteAnmerkung(commit, datei, zeile, text), out _);
            Assert.That(angelegt, Is.True, "die Anmerkung muss vor dem Beenden angenommen werden");
        }

        public void AnnotiereBereich(string commit, string datei, int von, int bis, string text)
        {
            var angelegt = anmerkungen.VersucheAnzuhaengen(new GepruefteAnmerkung(commit, datei, null, text, von, bis), out _);
            Assert.That(angelegt, Is.True, "die Bereichsanmerkung muss vor dem Beenden angenommen werden");
        }

        /// <summary>Wie viele Lesevorgänge der markierten Zeilen das Protokoll nennt (je (Commit, Datei) höchstens einer).</summary>
        public int Lesevorgaenge()
        {
            return protokollziel.ToString().Split('\n').Count(zeile => zeile.Contains("gelesen (", StringComparison.Ordinal));
        }

        public void Hake(string commit, string datei, bool abgehakt)
        {
            var ergebnis = dateiAbhaken.Setze(new Hakenanfrage(commit, datei, abgehakt));
            Assert.That(ergebnis.Ausgang, Is.EqualTo(Hakenausgang.Gesetzt), "Kontrolle: der Haken ist gesetzt");
        }

        public ErgebnisKopierenAntwort Kopiere()
        {
            return interactor.Erzeuge();
        }
    }
}