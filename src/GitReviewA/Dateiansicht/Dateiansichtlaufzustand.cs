namespace GitReviewA.Dateiansicht;

/// <summary>Ob „Schließen“ angenommen wurde; nur dann endet der Lauf mit Exit 0 (R00043, Ende).</summary>
internal sealed class Dateiansichtlaufzustand
{
    private volatile bool istGeschlossen;

    public bool IstGeschlossen
    {
        get => istGeschlossen;
        set => istGeschlossen = value;
    }
}
