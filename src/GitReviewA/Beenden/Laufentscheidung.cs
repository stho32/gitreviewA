namespace GitReviewA.Beenden;

/// <summary>Was der Lauf am Ende wird: er läuft noch, „Beenden“ ist angenommen oder der Abbruch ist angenommen.</summary>
internal enum Laufentscheidung
{
    Laeuft,
    Beenden,
    Abbruch,
}

/// <summary>Der Ausgang eines Versuchs: neu angenommen oder der bereits geltende Zustand.</summary>
internal sealed record Laufversuch(bool Angenommen, Laufentscheidung Zustand);