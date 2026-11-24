using GitReviewA.Git;

namespace GitReviewA.Haken;

/// <summary>Die Dateien eines Commits der Auswahl, in der Reihenfolge von git (Status, Pfad, alter Pfad, Zeilenzahlen).</summary>
internal sealed record Commitdateien(string Commit, Dateiaenderungen Dateien);
