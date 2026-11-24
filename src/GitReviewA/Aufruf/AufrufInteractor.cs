using GitReviewA.Git;
using GitReviewA.Protokoll;

namespace GitReviewA.Aufruf;

/// <summary>
/// Die Interaction „Ungültiger Aufruf“: prüft erst die Umgebung (Repoprüfung), liest dann die Auswahl — beides vor dem Serverstart.
/// Ein ungültiger Aufruf kommt als Aufruffehler zurück; der rohe git-Text hängt nur im Debugtext.
/// </summary>
internal static class AufrufInteractor
{
    public static async Task<Aufruffolge> StarteAsync(Aufrufanfrage anfrage, StderrProtokoll protokoll)
    {
        try
        {
            var arbeitsbaumwurzel = GitLeser.WurzelLesen(anfrage.Arbeitsordner);
            var commits = await CommitsDerAuswahl.LesenAsync(anfrage.Startauftrag.Auswahl, anfrage.Stdin, anfrage.Arbeitsordner, protokoll);
            return Aufruffolge.Erfolg(commits, arbeitsbaumwurzel);
        }
        catch (Aufruffehler fehler)
        {
            return Aufruffolge.Abgewiesen(fehler);
        }
    }
}
