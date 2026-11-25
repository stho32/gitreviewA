namespace GitReviewA.Dateiansicht;

/// <summary>Die Gründe, aus denen die Dateiansicht eine Angabe nicht zeigt — eine Stelle, ein Wortlaut je Grund (R00043).</summary>
internal enum Quellengrundart
{
    DateiNichtGefunden,
    DateiNichtLesbar,
    IstEinVerzeichnis,
    IstEinSymbolischerLink,
    KeineRegulaereDatei,
    ZuGross,
    ZusammenZuGross,
    Binaerdatei,
    Utf16NichtUnterstuetzt,
    UngueltigesUtf8,
    NameNichtUebergebbar,
}

/// <summary>
/// Ein Grund samt den Angaben, die sein Wortlaut braucht: das ungültige Byte und seine Stelle (ab 1, ab Dateianfang mit BOM).
/// Reiner Wert; die Meldung entsteht in <see cref="QuellengrundMeldungen"/>.
/// </summary>
internal sealed record Quellengrund(Quellengrundart Art, byte UngueltigesByte = 0, int Stelle = 0)
{
    public static Quellengrund DateiNichtGefunden => new(Quellengrundart.DateiNichtGefunden);

    public static Quellengrund DateiNichtLesbar => new(Quellengrundart.DateiNichtLesbar);

    public static Quellengrund IstEinVerzeichnis => new(Quellengrundart.IstEinVerzeichnis);

    public static Quellengrund IstEinSymbolischerLink => new(Quellengrundart.IstEinSymbolischerLink);

    public static Quellengrund KeineRegulaereDatei => new(Quellengrundart.KeineRegulaereDatei);

    public static Quellengrund ZuGross => new(Quellengrundart.ZuGross);

    public static Quellengrund ZusammenZuGross => new(Quellengrundart.ZusammenZuGross);

    public static Quellengrund Binaerdatei => new(Quellengrundart.Binaerdatei);

    public static Quellengrund Utf16NichtUnterstuetzt => new(Quellengrundart.Utf16NichtUnterstuetzt);

    public static Quellengrund NameNichtUebergebbar => new(Quellengrundart.NameNichtUebergebbar);

    public static Quellengrund UngueltigesUtf8(byte ungueltigesByte, int stelle)
    {
        return new Quellengrund(Quellengrundart.UngueltigesUtf8, ungueltigesByte, stelle);
    }
}