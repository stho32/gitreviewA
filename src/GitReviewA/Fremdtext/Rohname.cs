namespace GitReviewA.Fremdtext;

/// <summary>
/// Die Bytes eines Namens aus dem fremden Repo, der kein gültiges UTF-8 ist: aus dem angezeigten Namen mit Marke `⟨0xFF⟩` lassen sie sich
/// nicht zurückgewinnen (ein Name kann die Zeichen der Marke auch wörtlich tragen). Gleich sind zwei Rohnamen mit denselben Bytes.
/// </summary>
internal sealed class Rohname : IEquatable<Rohname>
{
    private const byte Zeilenumbruch = (byte)'\n';
    private const byte Wagenruecklauf = (byte)'\r';

    private readonly byte[] bytes;

    public Rohname(IEnumerable<byte> bytes)
    {
        this.bytes = bytes.ToArray();
    }

    public ReadOnlySpan<byte> Bytes => bytes;

    /// <summary>git liest Pfade über stdin zeilenweise: ein Name mit LF oder CR lässt sich dort nicht übergeben.</summary>
    public bool EnthaeltZeilenende => bytes.Contains(Zeilenumbruch) || bytes.Contains(Wagenruecklauf);

    public bool Equals(Rohname? anderer)
    {
        return anderer is not null && bytes.AsSpan().SequenceEqual(anderer.bytes);
    }

    public override bool Equals(object? anderes)
    {
        return Equals(anderes as Rohname);
    }

    public override int GetHashCode()
    {
        var hash = new HashCode();
        hash.AddBytes(bytes);
        return hash.ToHashCode();
    }

    public override string ToString()
    {
        return Convert.ToHexString(bytes);
    }
}
