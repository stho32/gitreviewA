using System.Text.Json.Serialization;
using GitReviewA.Fremdtext;

namespace GitReviewA.Git;

/// <summary>
/// Plus und Minus sind bei Binärdateien leer: git zählt dort keine Zeilen. `Rohpfad` und `RohAlterPfad` stehen nur da, wenn der Name
/// kein gültiges UTF-8 ist — der Diff übergibt dann die Bytes an git; die Dateiliste der Schnittstelle zeigt sie nicht.
/// </summary>
internal sealed record Dateiaenderung(
    string Status,
    string Pfad,
    string? AlterPfad,
    int? Plus,
    int? Minus,
    [property: JsonIgnore] Rohname? Rohpfad = null,
    [property: JsonIgnore] Rohname? RohAlterPfad = null);
