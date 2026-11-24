namespace GitReviewA.Anmerkungen;

/// <summary>Antwort auf eine erfolgreiche Änderung: die stabile Nummer und der neue Text.</summary>
internal sealed record AnmerkungGeaendertAntwort(int Nummer, string Text);