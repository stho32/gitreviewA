using System.Diagnostics.CodeAnalysis;

namespace GitReviewA.Anmerkungen;

internal static class AnmerkungsPruefer
{
    private const int HoechsteTextlaengeInZeichen = 10_000;
    private const char Zeilentrenner = '\u2028';
    private const char Absatztrenner = '\u2029';

    public static Pruefergebnis Pruefe(NeueAnmerkung? neu, CommitAuswahl auswahl)
    {
        if (neu is null)
        {
            return Pruefergebnis.Abgelehnt("Anmerkung fehlt im Körper der Anfrage");
        }
        if (!IstGueltigerCommit(neu.Commit, auswahl, out var commitGrund))
        {
            return Pruefergebnis.Abgelehnt(commitGrund);
        }
        if (!IstGueltigeDatei(neu.Datei, out var dateiGrund))
        {
            return Pruefergebnis.Abgelehnt(dateiGrund);
        }
        if (!IstGueltigeZeile(neu.Zeile, out var zeileGrund))
        {
            return Pruefergebnis.Abgelehnt(zeileGrund);
        }
        if (!IstGueltigerText(neu.Text, out var textGrund))
        {
            return Pruefergebnis.Abgelehnt(textGrund);
        }
        return Pruefergebnis.Gueltig(new GepruefteAnmerkung(neu.Commit, neu.Datei, neu.Zeile, neu.Text));
    }

    private static bool IstGueltigerCommit([NotNullWhen(true)] string? commit, CommitAuswahl auswahl, out string grund)
    {
        grund = string.Empty;
        if (string.IsNullOrEmpty(commit))
        {
            grund = "Commit fehlt";
            return false;
        }
        if (auswahl.EnthaeltGenau(commit))
        {
            return true;
        }
        var istGekuerzterHashAusDerAuswahl = auswahl.HatHashMitAnfang(commit);
        if (istGekuerzterHashAusDerAuswahl)
        {
            grund = "Commit-Hash ist gekürzt — nötig ist der volle Hash";
            return false;
        }
        grund = "Commit gehört nicht zur Auswahl dieses Laufs";
        return false;
    }

    private static bool IstGueltigeDatei([NotNullWhen(true)] string? datei, out string grund)
    {
        grund = string.Empty;
        if (string.IsNullOrWhiteSpace(datei))
        {
            grund = "Datei fehlt";
            return false;
        }
        var enthaeltZeilenumbruchOderSteuerzeichen = datei.Any(IstZeilenumbruchOderSteuerzeichen);
        if (enthaeltZeilenumbruchOderSteuerzeichen)
        {
            grund = "Datei enthält einen Zeilenumbruch oder ein Steuerzeichen";
            return false;
        }
        return true;
    }

    private static bool IstZeilenumbruchOderSteuerzeichen(char zeichen)
    {
        return char.IsControl(zeichen) || zeichen == Zeilentrenner || zeichen == Absatztrenner;
    }

    private static bool IstGueltigeZeile(int? zeile, out string grund)
    {
        grund = string.Empty;
        var zeileLiegtVorDerErsten = zeile < 1;
        if (zeileLiegtVorDerErsten)
        {
            grund = "Zeile zählt ab 1";
            return false;
        }
        return true;
    }

    private static bool IstGueltigerText([NotNullWhen(true)] string? text, out string grund)
    {
        grund = string.Empty;
        if (string.IsNullOrWhiteSpace(text))
        {
            grund = "Text fehlt";
            return false;
        }
        var textIstZuLang = text.EnumerateRunes().Count() > HoechsteTextlaengeInZeichen;
        if (textIstZuLang)
        {
            grund = $"Text ist länger als {HoechsteTextlaengeInZeichen} Zeichen";
            return false;
        }
        return true;
    }
}
