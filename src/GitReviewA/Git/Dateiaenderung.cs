namespace GitReviewA.Git;

/// <summary>Plus und Minus sind bei Binärdateien leer: git zählt dort keine Zeilen.</summary>
internal sealed record Dateiaenderung(string Status, string Pfad, string? AlterPfad, int? Plus, int? Minus);
