using GitReviewA.Git;
using GitReviewA.Protokoll;

namespace GitReviewA.Aufruf;

/// <summary>
/// Die Interaction „Ungültiger Aufruf“: liest eine stdin-Auswahl zuerst (ohne git), prüft dann die Umgebung
/// (Repoprüfung) und liest die Auswahl — alles vor dem Serverstart.
/// Ein ungültiger Aufruf kommt als Aufruffehler zurück; der rohe git-Text hängt nur im Debugtext.
/// Die <paramref name="grenze"/> ist der Testparameter der Ausgabegrenze (Produktwert 8 MiB), sonst gilt <see cref="Ausgabegrenze.Standard"/>.
/// </summary>
internal static class AufrufInteractor
{
    public static async Task<Aufruffolge> StarteAsync(Aufrufanfrage anfrage, StderrProtokoll protokoll, Ausgabegrenze? grenze = null)
    {
        try
        {
            var vorbereiteteAuswahl = await CommitsDerAuswahl.VorbereitenAsync(anfrage.Startauftrag.Auswahl, anfrage.Stdin);
            var arbeitsbaumwurzel = Reposituation.WurzelOderGrund(anfrage.Arbeitsordner);
            var commits = CommitsDerAuswahl.Lesen(vorbereiteteAuswahl, anfrage.Arbeitsordner, protokoll, grenze);
            return Aufruffolge.Erfolg(commits, arbeitsbaumwurzel);
        }
        catch (Aufruffehler fehler)
        {
            return Aufruffolge.Abgewiesen(fehler);
        }
    }
}
