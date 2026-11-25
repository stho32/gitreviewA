using System.Diagnostics.CodeAnalysis;

namespace GitReviewA.Anmerkungen;

internal static class AnmerkungsPruefer
{
    private const char Zeilentrenner = '\u2028';
    private const char Absatztrenner = '\u2029';
    private const int HoechstePfadlaengeInZeichen = 4096;

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
        if (TraegtZeileUndSpanne(neu))
        {
            return Pruefergebnis.Abgelehnt("Zeile und Bereich (von/bis) schließen sich aus");
        }
        if (!IstGueltigeSpanne(neu.Von, neu.Bis, out var spannenGrund))
        {
            return Pruefergebnis.Abgelehnt(spannenGrund);
        }
        if (!Anmerkungstext.IstGueltig(neu.Text, out var textGrund))
        {
            return Pruefergebnis.Abgelehnt(textGrund);
        }
        return Pruefergebnis.Gueltig(new GepruefteAnmerkung(neu.Commit, neu.Datei, neu.Zeile, neu.Text, neu.Von, neu.Bis));
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
        var dateiIstZuLang = datei.Length > HoechstePfadlaengeInZeichen;
        if (dateiIstZuLang)
        {
            grund = $"Datei ist länger als {HoechstePfadlaengeInZeichen} Zeichen";
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

    private static bool TraegtZeileUndSpanne(NeueAnmerkung neu)
    {
        return neu.Zeile is not null && (neu.Von is not null || neu.Bis is not null);
    }

    /// <summary>Form der Spanne (R00031): beide Zahlen, `von` ≥ 1, `bis` ≥ `von`; ganzzahlig prüft schon der JSON-Leser.</summary>
    private static bool IstGueltigeSpanne(int? von, int? bis, out string grund)
    {
        grund = string.Empty;
        var hatVon = von is not null;
        var hatBis = bis is not null;
        if (!hatVon && !hatBis)
        {
            return true;
        }
        if (!hatVon)
        {
            grund = "von fehlt (bis ohne von)";
            return false;
        }
        if (!hatBis)
        {
            grund = "bis fehlt (von ohne bis)";
            return false;
        }
        if (von < 1)
        {
            grund = "von zählt ab 1";
            return false;
        }
        if (bis < von)
        {
            grund = "bis liegt vor von";
            return false;
        }
        return true;
    }
}
