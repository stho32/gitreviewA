using GitReviewA.Git;

namespace GitReviewA.Diff;

internal interface IDiffquelle
{
    /// <summary>Der Patch der Datei ab dem ersten Hunk-Kopf.</summary>
    string Lesen(string hash, Dateiaenderung datei);

    /// <summary>Der Patch einer als binär eingestuften Datei mit allen Bytes als Text — nur auf ausdrückliche Wahl.</summary>
    string AlsTextLesen(string hash, Dateiaenderung datei);

    /// <summary><see cref="Diffaufbereitung.GrundAttribut"/> oder <see cref="Diffaufbereitung.GrundNullbytes"/>.</summary>
    string BinaerGrund(string hash, Dateiaenderung datei);
}
