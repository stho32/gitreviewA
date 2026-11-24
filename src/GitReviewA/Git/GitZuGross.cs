namespace GitReviewA.Git;

/// <summary>
/// Die Ausgabe eines `git`-Aufrufs hat die <see cref="Ausgabegrenze"/> überschritten; der Prozess wurde beendet und es gibt keinen
/// (auch keinen gekürzten) Rumpf. Der Aufrufer bildet das auf den Ausgang „zu groß“ ab — nie auf „nicht lesbar“.
/// </summary>
internal sealed class GitZuGross(string aufruf, long grenze) : Exception($"Ausgabe von {aufruf} überschreitet die Grenze von {grenze} Byte")
{
    public string Aufruf { get; } = aufruf;

    public long Grenze { get; } = grenze;
}
