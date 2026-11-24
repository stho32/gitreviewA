using System.Globalization;
using System.Text;

namespace GitReviewA.Fremdtext;

/// <summary>
/// Namen und Text aus dem fremden Repo sind Bytes, nicht immer gültiges UTF-8. Jedes Byte, das sich nicht dekodieren lässt, steht als
/// Marke `⟨0xFF⟩` — verschiedene Bytes ergeben verschiedene Namen, kein Name fällt auf das Ersatzzeichen U+FFFD zusammen.
/// Gültiges UTF-8 bleibt Zeichen für Zeichen; unsichtbare Zeichen darin markiert <see cref="UnsichtbareZeichen"/>.
/// </summary>
internal static class FremdeBytes
{
    public static Encoding Utf8MitBytemarken { get; } = Utf8MitBytemarkenErzeugen();

    private static Encoding Utf8MitBytemarkenErzeugen()
    {
        var kodierung = (Encoding)new UTF8Encoding(encoderShouldEmitUTF8Identifier: false).Clone();
        kodierung.DecoderFallback = new BytemarkenFallback();
        return kodierung;
    }

    private static string Marke(byte unbekannt)
    {
        return string.Create(CultureInfo.InvariantCulture, $"⟨0x{unbekannt:X2}⟩");
    }

    private sealed class BytemarkenFallback : DecoderFallback
    {
        private const int LaengeEinerMarke = 6;
        private const int HoechstensUnbekannteBytesJeAufruf = 4;

        public override int MaxCharCount => LaengeEinerMarke * HoechstensUnbekannteBytesJeAufruf;

        public override DecoderFallbackBuffer CreateFallbackBuffer()
        {
            return new BytemarkenPuffer();
        }
    }

    private sealed class BytemarkenPuffer : DecoderFallbackBuffer
    {
        private string marken = string.Empty;
        private int position;

        public override int Remaining => marken.Length - position;

        public override bool Fallback(byte[] bytesUnknown, int index)
        {
            var ergebnis = new StringBuilder();
            foreach (var unbekannt in bytesUnknown)
            {
                ergebnis.Append(Marke(unbekannt));
            }
            marken = ergebnis.ToString();
            position = 0;
            return true;
        }

        public override char GetNextChar()
        {
            var istErschoepft = position >= marken.Length;
            if (istErschoepft)
            {
                return '\0';
            }
            var zeichen = marken[position];
            position += 1;
            return zeichen;
        }

        public override bool MovePrevious()
        {
            var istAmAnfang = position == 0;
            if (istAmAnfang)
            {
                return false;
            }
            position -= 1;
            return true;
        }

        public override void Reset()
        {
            marken = string.Empty;
            position = 0;
        }
    }
}
