namespace PedroOS.Web.Models;

/// <summary>A portfolio project as stored in Data/projects.json.</summary>
public sealed record Project
{
    public required string Slug { get; init; }
    public required string Name { get; init; }
    public required string ExecutableName { get; init; }
    public required string Icon { get; init; }
    public required string Summary { get; init; }
    public string Description { get; init; } = string.Empty;
    public string Problem { get; init; } = string.Empty;
    public string Solution { get; init; } = string.Empty;
    public IReadOnlyList<string> Stack { get; init; } = [];
    public IReadOnlyList<string> Highlights { get; init; } = [];
    public string Status { get; init; } = "Unknown";
    public string? RepositoryUrl { get; init; }
    public string? DemoUrl { get; init; }
    public string? License { get; init; }
    public IReadOnlyList<ProjectScreenshot> Screenshots { get; init; } = [];
    /// <summary>Featured projects get their own .exe in C:\Projects; others live in MoreProjects.</summary>
    public bool Featured { get; init; } = true;
    /// <summary>Marks content that still needs to be completed by the owner.</summary>
    public bool IsPlaceholder { get; init; }
    public string? PlaceholderNote { get; init; }
}

public sealed record ProjectScreenshot
{
    public required string Src { get; init; }
    public required string Alt { get; init; }
    public string? Caption { get; init; }
}
