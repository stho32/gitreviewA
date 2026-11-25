namespace GitReviewA.Dateiansicht;

/// <summary>Die Liste der Dateiansicht: je Datei Nummer, Anzeigename (mit Marken), echter Pfad (mit Marken), Größe, Zeilen, Kodierung, Zeilenende.</summary>
internal sealed record DateiansichtlisteAntwort(IReadOnlyList<DateieintragAntwort> Dateien);

internal sealed record DateieintragAntwort(
    int Nummer,
    string Anzeigename,
    string EchterPfad,
    int Groesse,
    int Zeilen,
    string Kodierung,
    string Zeilenende,
    int GekuerzteZeilen);

/// <summary>Der volle Text einer Datei — die eine Antwort, aus der die Seite zeigt und kopiert; Marken entstehen erst beim Zeichnen.</summary>
internal sealed record DateitextAntwort(string Text, int GekuerzteZeilen);

internal sealed record SchliessenAntwort(string Meldung);
