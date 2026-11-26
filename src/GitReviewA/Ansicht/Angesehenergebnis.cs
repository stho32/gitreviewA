namespace GitReviewA.Ansicht;

/// <summary><see cref="Anzahl"/> ist der Stand nach der Anfrage; <see cref="Grund"/> nennt den Ablehnungsgrund, nie den Wortlaut der Anfrage.</summary>
internal sealed record Angesehenergebnis(Angesehenausgang Ausgang, int Anzahl, string Grund);
