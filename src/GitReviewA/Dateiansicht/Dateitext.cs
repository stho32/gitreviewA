namespace GitReviewA.Dateiansicht;

/// <summary>Die Kodierung der gezeigten Datei; UTF-16 und Latin-1 sind spätere Ausbaustufen (PO 2026-11-25, Zeile 209).</summary>
internal enum Kodierung
{
    Utf8,
    Utf8MitBom,
}

/// <summary>Das Zeilenende der Datei; ein einzelnes CR ohne LF zählt nicht (R00043, L4).</summary>
internal enum Zeilenende
{
    Keins,
    Lf,
    Crlf,
    Gemischt,
}

/// <summary>
/// Eine eingeordnete Datei: der Text ohne BOM, die Größe in Bytes (mit BOM), Kodierung, Zeilenende und die Zeilenzahl nach der
/// einen Definition (Anzahl der LF + 1 bei Rest). Anzeige, Größe, Zeilenzahl und Kopie stammen aus denselben Bytes.
/// </summary>
internal sealed record Dateitext(string Text, int Groesse, Kodierung Kodierung, Zeilenende Zeilenende, int Zeilen)
{
    public string Kodierungstext => Kodierung == Kodierung.Utf8MitBom ? "UTF-8 mit BOM" : "UTF-8";

    public string Zeilenendetext => Zeilenende switch
    {
        Zeilenende.Lf => "LF",
        Zeilenende.Crlf => "CRLF",
        Zeilenende.Gemischt => "gemischt",
        _ => "keins",
    };
}

/// <summary>Einordnen gelingt oder nennt den Grund; nie halbe Ergebnisse.</summary>
internal sealed record Einordnung(Dateitext? Text, Quellengrund? Grund)
{
    public bool IstEingeordnet => Text is not null;

    public static Einordnung Gelungen(Dateitext text)
    {
        return new Einordnung(text, null);
    }

    public static Einordnung Abgelehnt(Quellengrund grund)
    {
        return new Einordnung(null, grund);
    }
}