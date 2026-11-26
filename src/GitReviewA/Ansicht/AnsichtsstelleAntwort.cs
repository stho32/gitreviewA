namespace GitReviewA.Ansicht;

/// <summary>Eine angesehene Stelle als Commit und Datei — derselbe rohe Name wie der Stand des Hakens.</summary>
internal sealed record AnsichtsstelleAntwort(string Commit, string Datei);
