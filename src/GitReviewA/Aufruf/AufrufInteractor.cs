using GitReviewA.Git;
using GitReviewA.Protokoll;

namespace GitReviewA.Aufruf;

/// <summary>
/// Die Interaction „Ungültiger Aufruf“: liest eine stdin-Auswahl zuerst (ohne git), prüft dann die Umgebung
/// (Repoprüfung) und liest die Auswahl — alles vor dem Serverstart.
/// Ein ungültiger Aufruf kommt als Aufruffehler zurück; der rohe git-Text hängt nur im Debugtext.
/// </summary>
internal static class AufrufInteractor
{
    public static async Task<Aufruffolge> StarteAsync(Aufrufanfrage anfrage, StderrProtokoll protokoll)
    {
        try
        {
            var vorbereiteteAuswahl = await CommitsDerAuswahl.VorbereitenAsync(anfrage.Startauftrag.Auswahl, anfrage.Stdin);
            var arbeitsbaumwurzel = GitLeser.WurzelLesen(anfrage.Arbeitsordner);
            var commits = CommitsDerAuswahl.Lesen(vorbereiteteAuswahl, anfrage.Arbeitsordner, protokoll);
            return Aufruffolge.Erfolg(commits, arbeitsbaumwurzel);
        }
        catch (Aufruffehler fehler)
        {
            return Aufruffolge.Abgewiesen(fehler);
        }
    }
}
