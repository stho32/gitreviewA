using GitReviewA.Anmerkungen;
using GitReviewA.Aufruf;
using GitReviewA.Beenden;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Protokoll;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>Treiber in-process: verdrahtet den Interactor wie der Webserver (Auswahl aus echtem git, Speicher, Protokoll auf Stufe Debug) und kennt als einziger seine Typen.</summary>
internal sealed class ZeileAnnotierenTreiber
{
    private readonly ZeileAnnotierenInteractor interactor;
    private readonly Anmerkungsspeicher speicher;
    private readonly StringWriter protokollziel;

    private ZeileAnnotierenTreiber(ZeileAnnotierenInteractor interactor, Anmerkungsspeicher speicher, StringWriter protokollziel)
    {
        this.interactor = interactor;
        this.speicher = speicher;
        this.protokollziel = protokollziel;
    }

    public static ZeileAnnotierenTreiber Starten(string startordner, IEnumerable<string> hashes)
    {
        var commits = GitLeser.Lesen(new CommitHashes(hashes), startordner);
        var protokollziel = new StringWriter();
        var protokoll = new StderrProtokoll(protokollziel, TimeProvider.System, Protokollstufe.Debug);
        var speicher = new Anmerkungsspeicher();
        var interactor = new ZeileAnnotierenInteractor(speicher, new CommitAuswahl(commits), protokoll);
        return new ZeileAnnotierenTreiber(interactor, speicher, protokollziel);
    }

    public Anlegeantwort LegeAn(string commit, string datei, int zeile, string text)
    {
        var ergebnis = interactor.LegeAn(new NeueAnmerkung(commit, datei, zeile, text));
        switch (ergebnis.Ausgang)
        {
            case Annotierenausgang.Angelegt:
                return new Anlegeantwort("angelegt", ergebnis.Angelegt!.Nummer, "");
            case Annotierenausgang.Ungueltig:
                return new Anlegeantwort("ungültig", null, ergebnis.Grund);
            case Annotierenausgang.Beendet:
                return new Anlegeantwort("beendet", null, ergebnis.Grund);
            default:
                throw new InvalidOperationException($"Unbekannter Ausgang {ergebnis.Ausgang}");
        }
    }

    public Listeneintrag[] Liste()
    {
        var eintraege = new List<Listeneintrag>();
        foreach (var anmerkung in interactor.Liste())
        {
            eintraege.Add(new Listeneintrag(anmerkung.Nummer, anmerkung.Commit, anmerkung.Datei, anmerkung.Zeile, anmerkung.Text));
        }
        return eintraege.ToArray();
    }

    /// <summary>Wie „Beenden“: schließt den Speicher ab und liefert das Ergebnis, das auf stdout ginge.</summary>
    public string Beenden()
    {
        speicher.VersucheAbzuschliessen();
        return ErgebnisFormatierer.Formatiere(speicher.Schnappschuss(), new Dateienstand([]));
    }

    public string Protokoll()
    {
        return protokollziel.ToString();
    }
}

internal sealed record Anlegeantwort(string Ausgang, int? Nummer, string Grund);

internal sealed record Listeneintrag(int Nummer, string Commit, string Datei, int? Zeile, string Text);
