using System.Text.Json;

namespace GitReviewA.Anmerkungen;

/// <summary>
/// Die **eine** Stelle für die Art einer Anmerkung (R00036): die gültigen Werte, ihr Wort, das Präfix für das Ergebnis und der Wert
/// fürs Protokoll. Anlegen, Ändern, Anzeige, Ergebnis, Kopieren und Ergebnis-Spalte lesen hier oder aus `GET /api/anmerkungen`.
/// </summary>
internal static class Anmerkungsart
{
    public const string Unbekannt = "Art unbekannt";

    private static readonly (string Wert, Art Art, string Wort)[] Werte =
    [
        ("muss", Art.Muss, "Muss"),
        ("frage", Art.Frage, "Frage"),
        ("idee", Art.Idee, "Idee"),
    ];

    /// <summary>Der Wert eines Körpers als Zeichenkette; <c>null</c> heißt „ohne Art“, jede andere Schreibung ist unbekannt.</summary>
    public static Artergebnis Pruefe(string? wert)
    {
        if (wert is null)
        {
            return Artergebnis.Gueltig(Artangabe.Ohne);
        }
        var treffer = Werte.FirstOrDefault(eintrag => eintrag.Wert == wert);
        if (treffer.Wert is null)
        {
            return Artergebnis.Abgelehnt();
        }
        return Artergebnis.Gueltig(Artangabe.Mit(treffer.Art));
    }

    /// <summary>
    /// Die Art aus dem JSON-Körper: fehlt das Feld, ist die Art nicht angegeben; ausdrückliches `null` heißt „ohne Art“; jede
    /// Zeichenkette geht durch <see cref="Pruefe"/>; jede andere Form (Zahl, Wahrheitswert, Objekt, Liste) ist „Art unbekannt“.
    /// </summary>
    public static Artergebnis Lies(JsonElement? roh)
    {
        if (roh is not { } element)
        {
            return Artergebnis.Gueltig(Artangabe.Fehlt);
        }
        if (element.ValueKind == JsonValueKind.Null)
        {
            return Artergebnis.Gueltig(Artangabe.Ohne);
        }
        if (element.ValueKind != JsonValueKind.String)
        {
            return Artergebnis.Abgelehnt();
        }
        return Pruefe(element.GetString());
    }

    /// <summary>Das Wort der Art („Muss“, „Frage“, „Idee“) für den Anmerkungskopf; ohne Art keins.</summary>
    public static string? Wort(Art? art)
    {
        return art is { } wert ? Eintrag(wert).Wort : null;
    }

    /// <summary>Der Wert der Art („muss“, „frage“, „idee“); ohne Art keiner.</summary>
    public static string? Wert(Art? art)
    {
        return art is { } wert ? Eintrag(wert).Wert : null;
    }

    /// <summary>Der Wert fürs Protokoll: `muss`, `frage`, `idee` oder `ohne`; nie der Text der Anmerkung.</summary>
    public static string Protokollwert(Art? art)
    {
        return Wert(art) ?? "ohne";
    }

    /// <summary>Das Präfix der ersten Textzeile im Ergebnis (R00036): `[Muss]`, `[Frage]` oder `[Idee]`; ohne Art keins.</summary>
    public static string? Praefix(Art? art)
    {
        return Wort(art) is { } wort ? $"[{wort}]" : null;
    }

    private static (string Wert, Art Art, string Wort) Eintrag(Art art)
    {
        return Werte.First(eintrag => eintrag.Art == art);
    }
}