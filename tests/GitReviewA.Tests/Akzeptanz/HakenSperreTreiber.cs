using GitReviewA.Anmerkungen;
using GitReviewA.Aufruf;
using GitReviewA.Beenden;
using GitReviewA.Dateien;
using GitReviewA.Diff;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Protokoll;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Treiber in-process für R00014: verdrahtet „Datei abhaken“ und „Diff lesen“ wie der Webserver (eine Auswahl, eine Übersicht aus echtem
/// git, Protokoll auf Stufe Debug) und kennt als einziger ihre Typen.
/// </summary>
internal sealed class HakenSperreTreiber
{
    private readonly DateiAbhakenInteractor haken;
    private readonly Hakenspeicher hakenspeicher;
    private readonly DiffLesenInteractor diff;
    private readonly StringWriter protokollziel;

    private HakenSperreTreiber(DateiAbhakenInteractor haken, Hakenspeicher hakenspeicher, DiffLesenInteractor diff, StringWriter protokollziel)
    {
        this.haken = haken;
        this.hakenspeicher = hakenspeicher;
        this.diff = diff;
        this.protokollziel = protokollziel;
    }

    public static HakenSperreTreiber Starten(string startordner, IEnumerable<string> hashes)
    {
        var commits = GitLeser.Lesen(new CommitHashes(hashes), startordner);
        var arbeitsordner = GitLeser.WurzelLesen(startordner);
        var protokollziel = new StringWriter();
        var protokoll = new StderrProtokoll(protokollziel, TimeProvider.System, Protokollstufe.Debug);
        var hakenspeicher = new Hakenspeicher();
        var haken = new DateiAbhakenInteractor(new GitUebersichtsquelle(commits, arbeitsordner), hakenspeicher, protokoll);
        var dateien = new GemerkteDateiquelle(new GitDateiquelle(arbeitsordner));
        var diff = new DiffLesenInteractor(commits, dateien, new GitDiffquelle(arbeitsordner), protokoll);
        return new HakenSperreTreiber(haken, hakenspeicher, diff, protokollziel);
    }

    public Hakenantwort Setze(string commit, string datei, bool abgehakt)
    {
        var ergebnis = haken.Setze(new Hakenanfrage(commit, datei, abgehakt));
        return new Hakenantwort(HakenausgangAlsWort(ergebnis.Ausgang), ergebnis.Abgehakt, ergebnis.Gesamt, ergebnis.Grund);
    }

    public Standantwort Stand()
    {
        var stand = haken.Stand();
        var stellen = new List<Stellenstand>();
        foreach (var stelle in stand.Dateien)
        {
            stellen.Add(stelle);
        }
        return new Standantwort(stand.IstLesbar, stand.Dateien.Abgehakt, stand.Dateien.Gesamt, stellen.ToArray());
    }

    public Dateiansicht Diff(string commit, string datei)
    {
        return Dateiansicht.Aus(diff.Lesen(new Diffanfrage(commit, datei, false, Diffumfang.Aenderungen)));
    }

    /// <summary>Wie „Beenden“: siegelt den Speicher und liefert das Ergebnis, das auf stdout ginge.</summary>
    public string Beenden()
    {
        hakenspeicher.VersucheZuSiegeln();
        return ErgebnisFormatierer.Formatiere(new Anmerkungsliste([]), haken.Ergebnisstand());
    }

    public string[] Protokollzeilen()
    {
        return protokollziel.ToString().Split('\n', StringSplitOptions.RemoveEmptyEntries);
    }

    private static string HakenausgangAlsWort(Hakenausgang ausgang)
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
}
