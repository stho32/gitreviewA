namespace GitReviewA.Aufruf;

/// <summary>Warum ein Muster des Aufrufs abgelehnt wird — bestimmt an der Prüfstelle, nicht aus dem Text.</summary>
internal enum Musterablehnungsgrund
{
    Leer,
    ZuLang,
    Steuerzeichen,
    ZuViele,
}
