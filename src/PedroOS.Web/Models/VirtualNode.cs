namespace PedroOS.Web.Models;

public enum VirtualNodeType
{
    Drive,
    Folder,
    Application,
    Document,
    Text,
    SystemFile,
    Shortcut,
}

/// <summary>Action executed when a virtual file is opened.</summary>
public sealed record FileAction
{
    /// <summary>"open-app", "open-url" or "navigate" (folders).</summary>
    public required string Kind { get; init; }
    public string? AppId { get; init; }
    /// <summary>Arguments passed to the application (e.g. project slug, tab id).</summary>
    public IReadOnlyDictionary<string, string>? Args { get; init; }
    public string? Url { get; init; }
}

/// <summary>Node of the virtual file system. Purely metadata — never maps to the server's real disk.</summary>
public sealed record VirtualNode
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required VirtualNodeType Type { get; init; }
    public required string Path { get; init; }
    public required string Icon { get; init; }
    public FileAction? Action { get; init; }
    public string? Description { get; init; }
    public string? Size { get; init; }
    /// <summary>Inline text content for .txt files (rendered as plain text, never as HTML).</summary>
    public string? Content { get; init; }
    public bool Hidden { get; init; }
    public IReadOnlyList<VirtualNode>? Children { get; init; }
}
