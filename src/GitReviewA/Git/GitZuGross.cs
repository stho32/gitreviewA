namespace GitReviewA.Git;

/// <summary>
/// Die Ausgabe eines `git`-Aufrufs hat die <see cref="Ausgabegrenze"/> überschritten; der Prozess wurde beendet und es gibt keinen
/// (auch keinen gekürzten) Rumpf. Der Aufrufer bildet das auf den Ausgang „zu groß“ ab — nie auf „nicht lesbar“.
/// Erbt von <see cref="GitFehler"/>, damit kein Aufrufer ihn ungefangen durchlässt (M3: kein Exit 134, keine 500 ohne Text);
/// wer „zu groß“ eigens meldet, fängt ihn **vor** <see cref="GitFehler"/>.
/// </summary>
internal sealed class GitZuGross(string aufruf, long grenze) : GitFehler($"Ausgabe von {aufruf} überschreitet die Grenze von {grenze} Byte")
{
    public string Aufruf { get; } = aufruf;

    public long Grenze { get; } = grenze;

    /// <summary>Der Grund, den die Ansichten zeigen (PO #60): „zu groß (über 8 MiB)“ — eine Stelle für den Wortlaut.</summary>
    public string UiGrund => $"zu groß (über {Ausgabegrenze.AlsText(Grenze)})";
}
