using GitReviewA.Git;

namespace GitReviewA.Dateiansicht;

/// <summary>Der Ausgang des Auflösens: der volle Commit-Hash oder der Grund.</summary>
internal sealed record Commitaufloesung(string? VollerHash, Quellengrund? Grund)
{
    public bool IstAufgeloest => VollerHash is not null;

    public static Commitaufloesung Erkannt(string vollerHash)
    {
        return new Commitaufloesung(vollerHash, null);
    }

    public static Commitaufloesung Abgelehnt(Quellengrund grund)
    {
        return new Commitaufloesung(null, grund);
    }
}

/// <summary>Der Eintrag des Pfads im Commit oder der Grund, warum es keiner ist.</summary>
internal sealed record Eintragsergebnis(CommitEintrag? Eintrag, Quellengrund? Grund)
{
    public bool IstGefunden => Eintrag is not null;

    public static Eintragsergebnis Gefunden(CommitEintrag eintrag)
    {
        return new Eintragsergebnis(eintrag, null);
    }

    public static Eintragsergebnis Abgelehnt(Quellengrund grund)
    {
        return new Eintragsergebnis(null, grund);
    }
}

/// <summary>Die Bytes eines Blobs aus dem Commit oder der Grund; gelesen wird ganz oder gar nicht.</summary>
internal sealed record Bloblesung(byte[]? Bytes, Quellengrund? Grund)
{
    public bool IstGelesen => Bytes is not null;

    public static Bloblesung Gelesen(byte[] bytes)
    {
        return new Bloblesung(bytes, null);
    }

    public static Bloblesung Abgelehnt(Quellengrund grund)
    {
        return new Bloblesung(null, grund);
    }
}

/// <summary>
/// Der Zugriff der Dateiansicht auf einen Commit und die Datei darin (R00046, B4262/B4263): dieselbe eine Stelle, an der eine
/// Commitquelle git erreicht — Auflösen, Eintrag lesen, Blob lesen. Alles ist über <see cref="GitStart"/> gehärtet, die
/// Ausgabegrenze und die Buchung hängen an der Aufrufstelle (Lehre #10); jeder Ausgang ist ein Ergebnis, nie eine Ausnahme.
/// </summary>
internal interface ICommitDateiquelle
{
    /// <summary>Den vollen Commit-Hash auflösen (nur Commit-Objekte; Tag, Tree, Blob → Grund).</summary>
    Commitaufloesung Aufloese(string hashEingabe);

    /// <summary>Den Eintrag des Pfads im Commit lesen (Datei, ausführbar, Verzeichnis, Link, Submodul) oder den Grund.</summary>
    Eintragsergebnis Eintrag(string vollerHash, string pfad, Ausgabegrenze grenze);

    /// <summary>Die Bytes des Blobs lesen (ganz oder gar nicht) und in den gemeinsamen Zähler buchen.</summary>
    Bloblesung Blob(string vollerHash, string pfad, Ausgabegrenze grenze);
}
