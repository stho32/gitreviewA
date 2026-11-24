namespace GitReviewA.Git;

/// <summary>Ansicht „nur Änderungen“ (drei Zeilen Kontext je Abschnitt) oder „ganze Datei“ (ein Abschnitt über die ganze Datei).</summary>
internal enum Diffumfang
{
    Aenderungen,
    Ganz,
}
