using GitReviewA.Git;

namespace GitReviewA.Diff;

/// <summary>`Hash` und `Pfad` wie angefragt, noch ungeprüft; `AlsText`: der Mensch hat bei einer Binärdatei „Als Text zeigen“ gewählt.</summary>
internal sealed record Diffanfrage(string Hash, string Pfad, bool AlsText, Diffumfang Umfang);
