using GitReviewA.Protokoll;

namespace GitReviewA.Aufruf;

internal sealed record Startauftrag(Auswahl Auswahl, int Port, bool BrowserOeffnen, Protokollstufe Mindeststufe, Musterliste Muster);
