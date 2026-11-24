using System.Diagnostics.CodeAnalysis;
using GitReviewA.Git;

namespace GitReviewA.Aufruf;

/// <summary>Ergebnis des Aufruf-Interactors: die gelesene Auswahl samt Arbeitsbaumwurzel oder der Grund, warum kein Server startet.</summary>
internal sealed record Aufruffolge(Commitzeilen? Commits, string? Arbeitsbaumwurzel, Aufruffehler? Fehler)
{
    [MemberNotNullWhen(true, nameof(Commits), nameof(Arbeitsbaumwurzel))]
    [MemberNotNullWhen(false, nameof(Fehler))]
    public bool IstErfolg => Fehler is null;

    public static Aufruffolge Erfolg(Commitzeilen commits, string arbeitsbaumwurzel)
    {
        return new Aufruffolge(commits, arbeitsbaumwurzel, null);
    }

    public static Aufruffolge Abgewiesen(Aufruffehler fehler)
    {
        return new Aufruffolge(null, null, fehler);
    }
}
