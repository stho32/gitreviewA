using GitReviewA.Git;

namespace GitReviewA.Diff;

internal interface IDiffquelle
{
    /// <summary>Der Patch der Datei ab dem ersten Hunk-Kopf.</summary>
    string Lesen(string hash, Dateiaenderung datei);
}
