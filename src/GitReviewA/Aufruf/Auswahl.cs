namespace GitReviewA.Aufruf;

/// <summary>Was der Aufruf prüfen lässt; je Art ist nur ihr Teil belegt, der andere leer.</summary>
internal sealed class Auswahl
{
    private Auswahl(Auswahlart art, CommitHashes hashes, Bereiche bereiche)
    {
        Art = art;
        Hashes = hashes;
        Bereiche = bereiche;
    }

    public Auswahlart Art { get; }

    public CommitHashes Hashes { get; }

    public Bereiche Bereiche { get; }

    public static Auswahl AusEinzelcommits(CommitHashes hashes)
    {
        return new Auswahl(Auswahlart.Einzelcommits, hashes, new Bereiche([]));
    }

    public static Auswahl AusBereichen(Bereiche bereiche)
    {
        return new Auswahl(Auswahlart.Bereiche, new CommitHashes([]), bereiche);
    }

    public static Auswahl UeberStdin()
    {
        return new Auswahl(Auswahlart.Stdin, new CommitHashes([]), new Bereiche([]));
    }
}
