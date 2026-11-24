using GitReviewA.Fremdtext;
using GitReviewA.Git;

namespace GitReviewA.Zusammen;

/// <summary>
/// Eine Datei der Auswahl einmal: die Netto-Änderung (lückenlos), sonst die zusammengefasste Sicht ohne Kette, ihre Stellen
/// (Commit und Pfad in diesem Commit) und der jüngste Commit der Auswahl, der sie ändert. Der Anzeigepfad trägt Steuerzeichen als Marke.
/// </summary>
internal sealed record NettoDatei(Dateiaenderung Datei, NettoStelle[] Stellen, string ZustaendigerCommit)
{
    public string Anzeigepfad => UnsichtbareZeichen.AlsMarken(Datei.Pfad);
}
