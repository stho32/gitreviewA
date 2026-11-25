namespace GitReviewA.Git;

/// <summary>
/// Vergleichsstellung für Leerraum: „beachten“ (Start) vergleicht unverändert, „ignorieren“ blendet reine Leerraum-Änderungen
/// **innerhalb** einer Zeile aus (`-w`, `--ignore-all-space`) — eine hinzugefügte oder entfernte leere Zeile bleibt sichtbar,
/// und die Nummern alt/neu jeder Zeile bleiben dieselben.
/// </summary>
internal enum Leerraum
{
    Beachten,
    Ignorieren,
}
