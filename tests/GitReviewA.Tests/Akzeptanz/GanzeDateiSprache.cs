using System.Runtime.Versioning;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Testsprache „Ganze Datei mit Diff“ (R00008): Commits heißen wie in der User Story, Zeilen stehen in Patch-Schreibweise.
/// Darunter der Treiber, der den Interactor in-process ruft; der Mensch wählt „nur Änderungen“ oder „ganze Datei“.
/// </summary>
[UnsupportedOSPlatform("windows")]
internal sealed class GanzeDateiSprache
{
    private readonly DiffRepo repo;
    private readonly DiffLesenTreiber treiber;

    private GanzeDateiSprache(DiffRepo repo, DiffLesenTreiber treiber)
    {
        this.repo = repo;
        this.treiber = treiber;
    }

    /// <summary>`gitreviewA <commits…>` im Repo, gestartet aus seiner Wurzel oder einem Unterordner.</summary>
    public static GanzeDateiSprache Aufruf(DiffRepo repo, string[] commits, string unterordner = "")
    {
        var startordner = Path.Combine(repo.Ordner, unterordner);
        var treiber = DiffLesenTreiber.Starten(startordner, commits.Select(repo.Hash));
        return new GanzeDateiSprache(repo, treiber);
    }

    public Dateiansicht GanzeDatei(string commit, string pfad)
    {
        return treiber.Lesen(repo.Hash(commit), pfad, ganzeDatei: true);
    }

    public Dateiansicht NurAenderungen(string commit, string pfad)
    {
        return treiber.Lesen(repo.Hash(commit), pfad, ganzeDatei: false);
    }

    /// <summary>`git show <commit>:<pfad>` zeilenweise.</summary>
    public string[] StandNach(string commit, string pfad)
    {
        return Zeilen(repo.Git("show", $"{repo.Hash(commit)}:{pfad}"));
    }

    /// <summary>Der Stand im ersten Elternteil.</summary>
    public string[] StandVor(string commit, string pfad)
    {
        return Zeilen(repo.Git("show", $"{repo.Hash(commit)}^1:{pfad}"));
    }

    /// <summary>Entfernt die Objektdatei des Commits (`.git/objects/<2>/<38>`): jedes weitere Lesen über ihn scheitert.</summary>
    public void ObjektdateiEntfernen(string commit)
    {
        var hash = repo.Hash(commit);
        File.Delete(Path.Combine(repo.Ordner, ".git", "objects", hash[..2], hash[2..]));
    }

    public string[] Fehlerzeilen()
    {
        return treiber.Protokollzeilen().Where(zeile => zeile.Contains(" FEHLER ", StringComparison.Ordinal)).ToArray();
    }

    public string[] DiffZeilenImProtokoll(string commit)
    {
        return treiber.Protokollzeilen().Where(zeile => zeile.Contains($"GET /api/commits/{repo.Hash(commit)}/diff", StringComparison.Ordinal)).ToArray();
    }

    public string HashVon(string commit)
    {
        return repo.Hash(commit);
    }

    private static string[] Zeilen(string inhalt)
    {
        return inhalt.Split('\n');
    }
}
