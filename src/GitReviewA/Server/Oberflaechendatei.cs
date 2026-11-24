namespace GitReviewA.Server;

internal sealed class Oberflaechendatei
{
    public Oberflaechendatei(byte[] inhalt, string inhaltstyp)
    {
        Inhalt = inhalt;
        Inhaltstyp = inhaltstyp;
    }

    public byte[] Inhalt { get; }

    public string Inhaltstyp { get; }
}
