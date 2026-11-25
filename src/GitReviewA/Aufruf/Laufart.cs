namespace GitReviewA.Aufruf;

/// <summary>Die Laufart eines Aufrufs; sie entsteht nur im <see cref="Aufrufleser"/> (R00043, Pflichtpunkt 5).</summary>
internal enum Laufart
{
    Review,
    Dateiansicht,
}