namespace GitReviewA.Aufruf;

/// <summary>Warum ein Aufruf ungültig ist — bestimmt an der Prüfstelle, nicht aus dem Text einer git-Meldung.</summary>
internal enum Aufrufgrund
{
    KeinRepository,
    NacktesRepository,
    GitNichtGefunden,
    LeereAuswahl,
    AuswahlNichtAufloesbar,
}
