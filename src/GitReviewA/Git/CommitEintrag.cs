namespace GitReviewA.Git;

/// <summary>Die Art eines Eintrags im Commit-Baum, aus dem POSIX-Modus von `git ls-tree`.</summary>
internal enum Baumart
{
    Datei,
    AusfuehrbareDatei,
    Verzeichnis,
    SymbolischerLink,
    Submodul,
}

/// <summary>
/// Ein Eintrag des Pfads im Commit: sein wörtlicher Name (root-relativ, aus gits Ausgabe) und die gemeldete Größe in Bytes.
/// Nur der wörtlich genannte Eintrag zählt (R00046, „keine Pathspec-Magie“); die Art entscheidet, ob gelesen oder abgelehnt wird.
/// </summary>
internal sealed record CommitEintrag(string Pfad, Baumart Art, long Groesse);
