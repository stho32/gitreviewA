namespace GitReviewA.Server;

internal sealed record CommitAntwort(string Hash, string KurzHash, string Autor, string Datum, string Betreff, string Rumpf);
