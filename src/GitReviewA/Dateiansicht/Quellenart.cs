using GitReviewA.Aufruf;

namespace GitReviewA.Dateiansicht;

/// <summary>Woher eine Angabe ihre Bytes nimmt: vom Datenträger oder aus dem Stand einer Datei in einem Commit (R00046).</summary>
internal abstract record Quelle;

/// <summary>Ein Pfad auf dem Datenträger — die Angabe so, wie sie der Aufrufer genannt hat (auch mit `./`).</summary>
internal sealed record Datentraegerquelle(string Pfad) : Quelle;

/// <summary>Eine Commitquelle `<commit>:<pfad>`: der Hash-Wortlaut vor dem ersten `:` und der Pfad dahinter.</summary>
internal sealed record Commitquelle(string Hash, string Pfad) : Quelle;

/// <summary>Der Ausgang des Erkennens: die Quelle oder der Grund, warum die Angabe keine ist. Nie beides.</summary>
internal sealed record Quellerkennung(Quelle? Quelle, Quellengrund? Grund)
{
    public bool IstErkannt => Quelle is not null;

    public static Quellerkennung Erkannt(Quelle quelle)
    {
        return new Quellerkennung(quelle, null);
    }

    public static Quellerkennung Abgelehnt(Quellengrund grund)
    {
        return new Quellerkennung(null, grund);
    }
}

/// <summary>
/// Die eine Stelle, die die Quellenart einer Angabe bestimmt (R00046, Pflichtpunkt 5): eine Commitquelle, wenn vor dem ersten `:`
/// 4–64 Hexziffern stehen (Groß und Klein gleichwertig) und dahinter ein nicht leerer Pfad; sonst ein Datenträgerpfad.
/// `./` vorn erzwingt den Datenträger (`./cafe:x.sql`), ein leerer Pfad (`<c>:`) ist ein Datenträgerpfad. Ein Commitpfad mit LF, CR
/// oder Ersatzzeichen U+FFFD ist nicht übergebbar. Namen wie `HEAD` sind keine Commits (PO Zeile 207). Reine Operation, ohne git:
/// Lesen, Anzeigename, Kopf und Startgründe fragen nur dieses Urteil.
/// </summary>
internal static class Quellenart
{
    private const string ErzwingtDatentraeger = "./";

    public static Quellerkennung Erkenne(string angabe)
    {
        if (angabe.StartsWith(ErzwingtDatentraeger, StringComparison.Ordinal))
        {
            return Quellerkennung.Erkannt(new Datentraegerquelle(angabe));
        }
        var trenner = angabe.IndexOf(':', StringComparison.Ordinal);
        if (trenner < 0)
        {
            return Quellerkennung.Erkannt(new Datentraegerquelle(angabe));
        }
        var hash = angabe[..trenner];
        var pfad = angabe[(trenner + 1)..];
        if (!CommitHashForm.IstCommitHash(hash) || pfad.Length == 0)
        {
            return Quellerkennung.Erkannt(new Datentraegerquelle(angabe));
        }
        if (Namensgrund(pfad) is Quellengrund namensgrund)
        {
            return Quellerkennung.Abgelehnt(namensgrund);
        }
        return Quellerkennung.Erkannt(new Commitquelle(hash, pfad));
    }

    /// <summary>LF und CR trennen an gits stdin; U+FFFD kann eine andere Datei meinen (L1/E4) — der Name ist nicht übergebbar.</summary>
    private static Quellengrund? Namensgrund(string pfad)
    {
        var traegtZeilenende = pfad.Contains('\n') || pfad.Contains('\r');
        if (traegtZeilenende || pfad.Contains('\uFFFD'))
        {
            return Quellengrund.NameNichtUebergebbar;
        }
        return null;
    }
}
