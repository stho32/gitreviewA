namespace GitReviewA.Haken;

/// <summary>Ist die Übersicht nicht lesbar, ist <see cref="Dateien"/> leer.</summary>
internal sealed record Hakenstand(bool IstLesbar, Dateienstand Dateien);
