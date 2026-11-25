using System.Buffers;
using System.Text;

namespace GitReviewA.Dateiansicht;

/// <summary>
/// Ordnet die gelesenen Bytes ein (R00043, B4203): Rangfolge Art → Größe → UTF-16/32-BOM → Null-Byte → UTF-8. Die Binärregel prüft
/// die **ganze** gelesene Datei, nicht nur die ersten 8 000 Bytes (L3). Die Stelle einer ungültigen Folge zählt ab 1 ab Dateianfang,
/// die BOM mit (L9). Ein einzelnes CR ohne LF ist kein Zeilenende (L4).
/// </summary>
internal static class Inhaltseinordnung
{
    private static readonly byte[] Utf8Bom = [0xEF, 0xBB, 0xBF];
    private static readonly byte[] Utf32LeBom = [0xFF, 0xFE, 0x00, 0x00];
    private static readonly byte[] Utf32BeBom = [0x00, 0x00, 0xFE, 0xFF];
    private static readonly byte[] Utf16LeBom = [0xFF, 0xFE];
    private static readonly byte[] Utf16BeBom = [0xFE, 0xFF];

    public static Einordnung Ordne(byte[] bytes)
    {
        if (TraegtUtfBom(bytes))
        {
            return Einordnung.Abgelehnt(Quellengrund.Utf16NichtUnterstuetzt);
        }
        if (bytes.Contains((byte)0))
        {
            return Einordnung.Abgelehnt(Quellengrund.Binaerdatei);
        }
        var hatBom = bytes.AsSpan().StartsWith(Utf8Bom);
        var bomLaenge = hatBom ? Utf8Bom.Length : 0;
        var inhalt = bytes.AsSpan(bomLaenge);
        if (!IstStrengesUtf8(inhalt, bomLaenge, out var grund))
        {
            return Einordnung.Abgelehnt(grund);
        }
        var text = Encoding.UTF8.GetString(inhalt);
        var zeilenende = ZeilenendeVon(inhalt);
        var zeilen = Zeilenzahl(inhalt);
        var kodierung = hatBom ? Kodierung.Utf8MitBom : Kodierung.Utf8;
        return Einordnung.Gelungen(new Dateitext(text, bytes.Length, kodierung, zeilenende, zeilen));
    }

    /// <summary>UTF-16 LE/BE und UTF-32 LE/BE an der BOM; sie kommen vor dem Null-Byte-Grund (L9).</summary>
    private static bool TraegtUtfBom(byte[] bytes)
    {
        var spanne = bytes.AsSpan();
        if (spanne.StartsWith(Utf32LeBom) || spanne.StartsWith(Utf32BeBom))
        {
            return true;
        }
        return spanne.StartsWith(Utf16LeBom) || spanne.StartsWith(Utf16BeBom);
    }

    private static bool IstStrengesUtf8(ReadOnlySpan<byte> inhalt, int bomLaenge, out Quellengrund grund)
    {
        var stelle = 0;
        while (stelle < inhalt.Length)
        {
            var status = Rune.DecodeFromUtf8(inhalt[stelle..], out _, out var verbraucht);
            if (status != OperationStatus.Done)
            {
                grund = Quellengrund.UngueltigesUtf8(inhalt[stelle], bomLaenge + stelle + 1);
                return false;
            }
            stelle += verbraucht;
        }
        grund = Quellengrund.DateiNichtLesbar;
        return true;
    }

    private static Zeilenende ZeilenendeVon(ReadOnlySpan<byte> inhalt)
    {
        var lf = 0;
        var crlf = 0;
        for (var i = 0; i < inhalt.Length; i++)
        {
            if (inhalt[i] != '\n')
            {
                continue;
            }
            lf++;
            if (i > 0 && inhalt[i - 1] == '\r')
            {
                crlf++;
            }
        }
        if (lf == 0)
        {
            return Zeilenende.Keins;
        }
        if (crlf == 0)
        {
            return Zeilenende.Lf;
        }
        return crlf == lf ? Zeilenende.Crlf : Zeilenende.Gemischt;
    }

    /// <summary>Zeilenzahl: Anzahl der Zeilenenden (LF), +1 wenn ein Rest ohne Schluss-LF folgt; 0 Bytes sind 0 Zeilen.</summary>
    private static int Zeilenzahl(ReadOnlySpan<byte> inhalt)
    {
        if (inhalt.Length == 0)
        {
            return 0;
        }
        var lf = 0;
        for (var i = 0; i < inhalt.Length; i++)
        {
            if (inhalt[i] == '\n')
            {
                lf++;
            }
        }
        return inhalt[^1] == '\n' ? lf : lf + 1;
    }
}