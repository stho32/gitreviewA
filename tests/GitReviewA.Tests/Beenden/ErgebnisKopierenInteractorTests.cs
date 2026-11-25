using GitReviewA.Anmerkungen;
using GitReviewA.Beenden;
using GitReviewA.Haken;
using GitReviewA.Protokoll;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Beenden;

/// <summary>
/// Spezifikation R00020 „Befunde kopieren“ auf Ebene des Interactors: derselbe Text wie stdout, ohne Anmerkungen, mit Anmerkungen,
/// mit Haken, mit gesperrter Stelle — und ohne Siegel. Den Weg über Endpunkt und Programm prüft <c>Akzeptanz/ErgebnisKopierenTests</c>.
/// </summary>
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
        private readonly DateiAbhakenInteractor dateiAbhaken;
        private readonly ErgebnisKopierenInteractor interactor;

        private Aufbau(IUebersichtsquelle uebersichtsquelle)
        {
            var protokoll = new StderrProtokoll(new StringWriter(), TimeProvider.System, Protokollstufe.Debug);
            dateiAbhaken = new DateiAbhakenInteractor(new GemerkteUebersicht(uebersichtsquelle), haken, TestNettoDateiliste.Leer(), protokoll);
            interactor = new ErgebnisKopierenInteractor(anmerkungen, dateiAbhaken);
        }

        public bool IstAbgeschlossen => anmerkungen.IstAbgeschlossen;

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