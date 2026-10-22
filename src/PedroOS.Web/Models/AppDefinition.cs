namespace PedroOS.Web.Models;

/// <summary>How an application renders its window content.</summary>
public enum AppContentKind
{
    /// <summary>Content is a server-rendered Razor partial fetched from /fragments/{appId}.</summary>
    Fragment,
    /// <summary>Content is rendered entirely by a TypeScript module.</summary>
    Client,
}

/// <summary>Static definition of an application known to PedroOS (shared with the client via boot data).</summary>
public sealed record AppDefinition
{
    public required string Id { get; init; }
    public required string Title { get; init; }
    public required string Icon { get; init; }
    public AppContentKind Content { get; init; } = AppContentKind.Client;
    public int DefaultWidth { get; init; } = 480;
    public int DefaultHeight { get; init; } = 360;
    public int MinWidth { get; init; } = 220;
    public int MinHeight { get; init; } = 140;
    public bool Resizable { get; init; } = true;
    public bool Maximizable { get; init; } = true;
    /// <summary>When false, opening the app again focuses the existing window (per instance key).</summary>
    public bool MultiInstance { get; init; }
    /// <summary>Public, server-rendered route (SEO) associated with the app, if any. May contain "{id}".</summary>
    public string? Route { get; init; }
    /// <summary>Hidden apps are not listed in the Start menu Programs folder.</summary>
    public bool Hidden { get; init; }
}
