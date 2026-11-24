using GitReviewA.Git;
using GitReviewA.Haken;

namespace GitReviewA.Zusammen;

/// <summary>
/// Eine Stelle der Netto-Liste: der Commit und die Datei in seiner Dateiliste (bei einer Umbenennung je Commit sein Pfad).
/// <see cref="Stelle"/> trägt den angezeigten Pfad ohne Marken — genau den Namen, den die Übersicht kennt.
/// </summary>
internal sealed record NettoStelle(string Commit, Dateiaenderung Datei)
{
    public Stelle Stelle()
    {
        return new Stelle(Commit, Datei.Pfad);
    }
}
