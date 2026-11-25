namespace GitReviewA.Sprung;

/// <summary>
/// Wie sich der Arbeitsbaum zur Stelle verhält: `Fehlt` und `VerlaesstWurzel` geben beide keinen Link, nur einen anderen Grund
/// im Diff-Kopf (R00021: „Datei liegt nicht im Arbeitsbaum“ bzw. „Pfad verlässt das Repository“).
/// </summary>
internal enum Sprungvorhandensein
{
    Vorhanden,
    Fehlt,
    VerlaesstWurzel,
}
