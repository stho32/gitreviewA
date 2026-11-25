namespace GitReviewA.Sprung;

internal enum Sprungausgang
{
    Beantwortet,
    NichtGefunden,
    NichtLesbar,
}

/// <summary>
/// Die Antwort einer Sprunganfrage: `Ziel` leer und `Grund` gesetzt heißt „kein Link, Grund als Text“; `Grund` leer heißt, das Ziel
/// steht bereit (ohne Zeile — die hängt der Browser an). `NichtGefunden` und `NichtLesbar` tragen weder Ziel noch Grund.
/// </summary>
internal sealed record Sprungergebnis(Sprungausgang Ausgang, string Ziel, bool Geaendert, string Grund)
{
    public static Sprungergebnis Sprung(string ziel, bool geaendert)
    {
        return new Sprungergebnis(Sprungausgang.Beantwortet, ziel, geaendert, "");
    }

    public static Sprungergebnis KeinSprung(string grund)
    {
        return new Sprungergebnis(Sprungausgang.Beantwortet, "", false, grund);
    }

    public static readonly Sprungergebnis NichtGefunden = new(Sprungausgang.NichtGefunden, "", false, "");
    public static readonly Sprungergebnis NichtLesbar = new(Sprungausgang.NichtLesbar, "", false, "");
}
