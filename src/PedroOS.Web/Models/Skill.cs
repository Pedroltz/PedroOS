namespace PedroOS.Web.Models;

/// <summary>Skills presented as "hardware devices" in System Properties (Data/skills.json).</summary>
public sealed record SkillCategory
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    /// <summary>Device-class label, e.g. "Development Processors".</summary>
    public required string DeviceClass { get; init; }
    public required string FileName { get; init; }
    public required string Icon { get; init; }
    public string Description { get; init; } = string.Empty;
    public IReadOnlyList<Skill> Items { get; init; } = [];
}

public sealed record Skill
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    /// <summary>Retro "driver" name shown in Device Manager.</summary>
    public string Driver { get; init; } = string.Empty;
    /// <summary>Concrete usage / experience description. No arbitrary percentage levels.</summary>
    public string Usage { get; init; } = string.Empty;
    public IReadOnlyList<string> UseCases { get; init; } = [];
    /// <summary>Slugs of related projects in projects.json.</summary>
    public IReadOnlyList<string> RelatedProjects { get; init; } = [];
}
