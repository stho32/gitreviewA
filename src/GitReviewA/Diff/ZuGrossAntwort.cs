namespace GitReviewA.Diff;

/// <summary>Antwort des Diff-Endpunkts über der Ausgabegrenze: 200 mit Kennzeichen und Meldung statt eines Patches (kein Fehler).</summary>
internal sealed record ZuGrossAntwort(bool ZuGross, string Meldung);
