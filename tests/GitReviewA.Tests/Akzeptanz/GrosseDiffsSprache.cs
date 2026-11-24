using System.Runtime.Versioning;
using GitReviewA.Git;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Testsprache „Große Diffs“ (R00017): Commits heißen wie in der User Story, die Ausgabegrenze ist über den Konstruktor klein setzbar.
/// Darunter der Treiber, der den Interactor in-process ruft; der Mensch wählt „nur Änderungen“, „ganze Datei“ oder „Als Text“.
/// </summary>
[UnsupportedOSPlatform("windows")]
internal sealed class GrosseDiffsSprache
{
    private readonly DiffRepo repo;
    private readonly DiffLesenTreiber treiber;

    private GrosseDiffsSprache(DiffRepo repo, DiffLesenTreiber treiber)
    {
        this.repo = repo;
        this.treiber = treiber;
    }

    /// <summary>`gitreviewA <commits…>` im Repo; ohne <paramref name="grenze"/> gilt der Produktwert.</summary>
    public static GrosseDiffsSprache Aufruf(DiffRepo repo, string[] commits, Ausgabegrenze? grenze = null)
    {
        if (grenze is null)
        {
            var mitProduktgrenze = DiffLesenTreiber.Starten(repo.Ordner, commits.Select(repo.Hash));
            return new GrosseDiffsSprache(repo, mitProduktgrenze);
        }
        var mitGrenze = DiffLesenTreiber.Starten(repo.Ordner, commits.Select(repo.Hash), grenze);
        return new GrosseDiffsSprache(repo, mitGrenze);
    }

    public Dateiansicht NurAenderungen(string commit, string pfad)
    {
        return treiber.Lesen(repo.Hash(commit), pfad, ganzeDatei: false);
    }

    public Dateiansicht GanzeDatei(string commit, string pfad)
    {
        return treiber.Lesen(repo.Hash(commit), pfad, ganzeDatei: true);
    }

    /// <summary>Die Wahl „Als Text zeigen“ bei einer Binärdatei.</summary>
    public Dateiansicht AlsText(string commit, string pfad)
    {
        return treiber.Lesen(repo.Hash(commit), pfad, ganzeDatei: false, alsText: true);
    }

    /// <summary>Entfernt die Objektdatei des Commits: jedes weitere Lesen über ihn scheitert (NichtLesbar).</summary>
    public void ObjektdateiEntfernen(string commit)
    {
        var hash = repo.Hash(commit);
        File.Delete(Path.Combine(repo.Ordner, ".git", "objects", hash[..2], hash[2..]));
    }

    public string HashVon(string commit)
    {
        return repo.Hash(commit);
    }

    public string[] Warnungen()
    {
        return treiber.Protokollzeilen().Where(zeile => zeile.Contains(" WARNUNG ", StringComparison.Ordinal)).ToArray();
    }

    public string[] DiffZeilenImProtokoll(string commit)
    {
        return treiber.Protokollzeilen().Where(zeile => zeile.Contains($"GET /api/commits/{repo.Hash(commit)}/diff", StringComparison.Ordinal)).ToArray();
    }
}
