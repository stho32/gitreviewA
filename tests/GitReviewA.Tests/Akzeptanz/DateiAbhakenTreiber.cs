using GitReviewA.Anmerkungen;
using GitReviewA.Aufruf;
using GitReviewA.Beenden;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Protokoll;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Treiber in-process: verdrahtet den Interactor wie der Webserver (Auswahl und Übersicht aus echtem git in der Wurzel des Startordners,
/// Speicher, Protokoll auf Stufe Debug) und kennt als einziger seine Typen. Zählt, wie oft die Übersicht gelesen wird.
/// </summary>
internal sealed class DateiAbhakenTreiber
{
    private readonly DateiAbhakenInteractor interactor;
    private readonly Hakenspeicher speicher;
    private readonly ZaehlendeUebersichtsquelle quelle;
    private readonly StringWriter protokollziel;

    private DateiAbhakenTreiber(DateiAbhakenInteractor interactor, Hakenspeicher speicher, ZaehlendeUebersichtsquelle quelle, StringWriter protokollziel)
    {
        this.interactor = interactor;
        this.speicher = speicher;
        this.quelle = quelle;
        this.protokollziel = protokollziel;
    }

    public static DateiAbhakenTreiber Starten(string startordner, IEnumerable<string> hashes)
    {
        var commits = GitLeser.Lesen(new CommitHashes(hashes), startordner);
        var arbeitsordner = GitLeser.WurzelLesen(startordner);
        return MitQuelle(new GitUebersichtsquelle(commits, arbeitsordner));
    }

    /// <summary>Mit einer Übersicht, die die ersten <paramref name="fehlversuche"/> Male scheitert wie git bei fehlendem Objekt.</summary>
    public static DateiAbhakenTreiber MitUnlesbarerUebersicht(int fehlversuche, string hash)
    {
        return MitQuelle(new ScheiterndeUebersichtsquelle(fehlversuche, hash));
    }

    private static DateiAbhakenTreiber MitQuelle(IUebersichtsquelle innereQuelle)
    {
        var protokollziel = new StringWriter();
        var protokoll = new StderrProtokoll(protokollziel, TimeProvider.System, Protokollstufe.Debug);
        var speicher = new Hakenspeicher();
        var quelle = new ZaehlendeUebersichtsquelle(innereQuelle);
        var interactor = new DateiAbhakenInteractor(new GemerkteUebersicht(quelle), speicher, protokoll);
        return new DateiAbhakenTreiber(interactor, speicher, quelle, protokollziel);
    }

    public Hakenantwort Setze(string? commit, string? datei, bool? abgehakt)
    {
        var ergebnis = interactor.Setze(new Hakenanfrage(commit, datei, abgehakt));
        return new Hakenantwort(AusgangAlsWort(ergebnis.Ausgang), ergebnis.Abgehakt, ergebnis.Gesamt, ergebnis.Grund);
    }

    public Hakenantwort SetzeOhneKoerper()
    {
        var ergebnis = interactor.Setze(null);
        return new Hakenantwort(AusgangAlsWort(ergebnis.Ausgang), ergebnis.Abgehakt, ergebnis.Gesamt, ergebnis.Grund);
    }

    public Standantwort Stand()
    {
        var stand = interactor.Stand();
        var stellen = new List<Stellenstand>();
        foreach (var stelle in stand.Dateien)
        {
            stellen.Add(stelle);
        }
        return new Standantwort(stand.IstLesbar, stand.Dateien.Abgehakt, stand.Dateien.Gesamt, stellen.ToArray());
    }

    /// <summary>Wie „Beenden“ ohne Anmerkungen: siegelt den Speicher und liefert das Ergebnis, das auf stdout ginge.</summary>
    public string Beenden()
    {
        speicher.VersucheZuSiegeln();
        return ErgebnisFormatierer.Formatiere(new Anmerkungsliste([]), interactor.Ergebnisstand());
    }

    public int Uebersichtslesungen()
    {
        return quelle.Lesungen;
    }

    public string Protokoll()
    {
        return protokollziel.ToString();
    }

    private static string AusgangAlsWort(Hakenausgang ausgang)
    {
        switch (ausgang)
        {
            case Hakenausgang.Gesetzt:
                return "gesetzt";
            case Hakenausgang.Ungueltig:
                return "ungültig";
            case Hakenausgang.Beendet:
                return "beendet";
            case Hakenausgang.NichtLesbar:
                return "nicht lesbar";
            default:
                throw new InvalidOperationException($"Unbekannter Ausgang {ausgang}");
        }
    }

    private sealed class ZaehlendeUebersichtsquelle(IUebersichtsquelle quelle) : IUebersichtsquelle
    {
        private int lesungen;

        public int Lesungen => lesungen;

        public Dateiuebersicht Lesen()
        {
            Interlocked.Increment(ref lesungen);
            return quelle.Lesen();
        }
    }

    private sealed class ScheiterndeUebersichtsquelle(int fehlversuche, string hash) : IUebersichtsquelle
    {
        private int versuche;

        public Dateiuebersicht Lesen()
        {
            versuche += 1;
            var scheitert = versuche <= fehlversuche;
            if (scheitert)
            {
                throw new GitFehler($"git log (Übersicht von 1 Commits) endete mit 128: fatal: bad object {hash}");
            }
            return new Dateiuebersicht([hash], [new Uebersichtsstelle(new Stelle(hash, "a.txt"), string.Empty)]);
        }
    }
}

internal sealed record Hakenantwort(string Ausgang, int Abgehakt, int Gesamt, string Grund);

internal sealed record Standantwort(bool IstLesbar, int Abgehakt, int Gesamt, Stellenstand[] Stellen);
