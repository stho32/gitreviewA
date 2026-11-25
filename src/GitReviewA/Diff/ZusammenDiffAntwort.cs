namespace GitReviewA.Diff;

/// <summary>
/// Die Antwort des Zusammen-Diffs. Bei lückenloser Kette ein Netto-Patch gegen den Elternstand des ältesten Commits
/// (<see cref="Netto"/> wahr, <see cref="Commits"/> in der Reihenfolge des Aufrufs); ohne Kette <see cref="Abschnitte"/> je Commit,
/// jeder mit seinem vollen Commit-Hash. Eine Binärdatei kommt mit <see cref="Grund"/> und ohne Byte-Inhalt.
/// </summary>
internal sealed record ZusammenDiffAntwort(
    string Pfad,
    string Status,
    string? AlterPfad,
    bool Netto,
    string[] Commits,
    string Art,
    string? Grund,
    string? Patch,
    Diffabschnitt[] Abschnitte);

/// <summary>Ein Abschnitt ohne lückenlose Kette: sein Commit, die Datei in diesem Commit (Anzeigepfad mit Marken und Status, wie
/// die Dateiliste dieses Commits sie zeigt — R00024 gilt je Commit), seine Art, sein Grund (nur binär) und sein Patch.</summary>
internal sealed record Diffabschnitt(string Commit, string Pfad, string Status, string Art, string? Grund, string Patch);
