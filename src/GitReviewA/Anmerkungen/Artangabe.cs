namespace GitReviewA.Anmerkungen;

/// <summary>
/// Was ein Körper über die Art sagt (R00036): gar nichts (<see cref="IstAngegeben"/> ist falsch), ausdrücklich „ohne“
/// (<see cref="Wert"/> ist <c>null</c>) oder eine der drei Arten. Beim Ändern heißt „nicht angegeben“: die gespeicherte Art bleibt.
/// </summary>
internal readonly record struct Artangabe(Art? Wert, bool IstAngegeben)
{
    public static Artangabe Fehlt => new(null, false);

    public static Artangabe Ohne => new(null, true);

    public static Artangabe Mit(Art art) => new(art, true);
}