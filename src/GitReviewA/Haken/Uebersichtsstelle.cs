namespace GitReviewA.Haken;

/// <summary>Eine Stelle der Übersicht mit ihrem Sperrgrund (leer, wenn ihr Diff lesbar ist).</summary>
internal sealed record Uebersichtsstelle(Stelle Stelle, string Sperrgrund);
