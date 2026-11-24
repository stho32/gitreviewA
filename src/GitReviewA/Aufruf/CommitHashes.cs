namespace GitReviewA.Aufruf;

internal sealed class CommitHashes
{
    private readonly string[] hashes;

    public CommitHashes(IEnumerable<string> hashes)
    {
        this.hashes = hashes.ToArray();
    }

    public int Anzahl => hashes.Length;

    public string this[int index] => hashes[index];

    public IEnumerator<string> GetEnumerator()
    {
        return ((IEnumerable<string>)hashes).GetEnumerator();
    }
}
