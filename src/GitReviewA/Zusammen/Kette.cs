using GitReviewA.Aufruf;

namespace GitReviewA.Zusammen;

/// <summary>
/// Ob die Auswahl eine lückenlose Kette bildet (product-owner 2026-11-24, Frage 7): nach Eltern geordnet ein durchgehender Pfad über
/// erste Elternteile. <see cref="Basis"/> ist der Elternstand des ältesten Commits (leer bei einer Wurzel); <see cref="Reihenfolge"/>
/// ist der Pfad ältester zuerst — ohne lückenlose Kette die Auswahl in Aufrufreihenfolge (dort nur ein Hinweis).
/// </summary>
internal sealed record Kette(bool Lueckenlos, string Basis, CommitHashes Reihenfolge)
{
    /// <summary>Alles andere gilt als „nicht lückenlos“ und wird je Commit beschriftet.</summary>
    public static Kette NichtLueckenlos(IEnumerable<string> auswahl)
    {
        return new Kette(false, string.Empty, new CommitHashes(auswahl));
    }
}
