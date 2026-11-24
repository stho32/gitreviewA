using System.Diagnostics.CodeAnalysis;

namespace GitReviewA.Haken;

/// <summary>
/// Prüft eine Hakenanfrage in zwei Stufen: erst die Form (ohne die Übersicht zu lesen), dann die Stelle gegen die Übersicht —
/// nur ein voller Hash der Auswahl und ein Pfad dieses Commits, dessen Diff lesbar ist, werden angenommen (sonst der Sperrgrund).
/// Die Gründe nennen nie den Wortlaut der Anfrage.
/// </summary>
internal static class HakenPruefer
{
    public static bool IstVollstaendig(Hakenanfrage? anfrage, [NotNullWhen(true)] out Hakenwunsch? wunsch, out string grund)
    {
        wunsch = null;
        if (anfrage is null)
        {
            grund = "Körper ist kein JSON-Objekt eines Hakens";
            return false;
        }
        if (anfrage.Commit is not { Length: > 0 } commit)
        {
            grund = "commit fehlt";
            return false;
        }
        if (anfrage.Datei is not { Length: > 0 } datei)
        {
            grund = "datei fehlt";
            return false;
        }
        if (anfrage.Abgehakt is not { } abgehakt)
        {
            grund = "abgehakt fehlt (true oder false)";
            return false;
        }
        wunsch = new Hakenwunsch(new Stelle(commit, datei), abgehakt);
        grund = string.Empty;
        return true;
    }

    public static bool GehoertZurAuswahl(Stelle stelle, Dateiuebersicht uebersicht, out string grund)
    {
        var istCommitDerAuswahl = uebersicht.EnthaeltCommit(stelle.Commit);
        if (!istCommitDerAuswahl)
        {
            grund = "Commit gehört nicht zur Auswahl (voller Hash nötig)";
            return false;
        }
        var kommtImCommitVor = uebersicht.Enthaelt(stelle);
        if (!kommtImCommitVor)
        {
            grund = "Datei kommt im Commit nicht vor";
            return false;
        }
        var sperrgrund = uebersicht.SperrgrundVon(stelle);
        var istGesperrt = sperrgrund.Length > 0;
        if (istGesperrt)
        {
            grund = sperrgrund;
            return false;
        }
        grund = string.Empty;
        return true;
    }
}
