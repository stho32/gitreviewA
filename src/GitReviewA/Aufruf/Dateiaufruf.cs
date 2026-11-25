using GitReviewA.Protokoll;

namespace GitReviewA.Aufruf;

/// <summary>
/// Der Aufruf der Dateiansicht: die Angaben in Aufrufreihenfolge (R00043 zeigt genau eine; R00045 hebt die Grenze),
/// dazu dieselben Optionen wie im Review. Die Laufart ist damit <see cref="Laufart.Dateiansicht"/>.
/// </summary>
internal sealed record Dateiaufruf(IReadOnlyList<string> Quellen, int Port, bool BrowserOeffnen, Protokollstufe Mindeststufe);