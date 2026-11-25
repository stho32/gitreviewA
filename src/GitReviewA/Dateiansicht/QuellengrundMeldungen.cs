using System.Globalization;

namespace GitReviewA.Dateiansicht;

/// <summary>
/// Der Wortlaut jedes Grundes — eine Stelle für alle Startmeldungen (R00043, „Prüfung beim Start“). Die Zeile auf stderr setzt
/// <c>FEHLER [Dateiansicht] &lt;Angabe mit Marken&gt;: &lt;Grund&gt;</c> daraus zusammen; Tests lesen denselben Wortlaut.
/// </summary>
internal static class QuellengrundMeldungen
{
    public static string Meldung(Quellengrund grund)
    {
        return grund.Art switch
        {
            Quellengrundart.DateiNichtGefunden => "Datei nicht gefunden",
            Quellengrundart.DateiNichtLesbar => "Datei nicht lesbar",
            Quellengrundart.IstEinVerzeichnis => "ist ein Verzeichnis",
            Quellengrundart.IstEinSymbolischerLink => "ist ein symbolischer Link — bitte das Ziel nennen",
            Quellengrundart.KeineRegulaereDatei => "keine reguläre Datei",
            Quellengrundart.ZuGross => "zu groß (über 8 MiB)",
            Quellengrundart.ZusammenZuGross => "zusammen zu groß (über 32 MiB)",
            Quellengrundart.Binaerdatei => "Binärdatei — enthält Null-Bytes",
            Quellengrundart.Utf16NichtUnterstuetzt => "UTF-16 wird nicht unterstützt",
            Quellengrundart.UngueltigesUtf8 => string.Create(
                CultureInfo.InvariantCulture,
                $"keine gültige UTF-8-Kodierung (Byte 0x{grund.UngueltigesByte:X2} an Stelle {grund.Stelle})"),
            Quellengrundart.NameNichtUebergebbar => "Name nicht übergebbar (ungültiges Byte oder Ersatzzeichen U+FFFD)",
            _ => throw new ArgumentOutOfRangeException(nameof(grund), grund.Art, "Unbekannter Quellengrund."),
        };
    }
}