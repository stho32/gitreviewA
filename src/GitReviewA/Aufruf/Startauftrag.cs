using GitReviewA.Protokoll;

namespace GitReviewA.Aufruf;

internal sealed record Startauftrag(CommitHashes Hashes, int Port, bool BrowserOeffnen, Protokollstufe Mindeststufe);
