using System.Text.RegularExpressions;
using PedroOS.Web.Models;

namespace PedroOS.Web.Services;

public sealed record RouteResolution(
    string AppId,
    IReadOnlyDictionary<string, string>? Args,
    string PageTitle,
    string MetaDescription,
    string CanonicalPath
);

public interface IAppCatalog
{
    IReadOnlyList<AppDefinition> GetAll();
    AppDefinition? GetById(string? appId);
    bool IsValidAppId(string? appId);
    RouteResolution? ResolveRoute(string? path);
}

public sealed partial class AppCatalog : IAppCatalog
{
    private readonly IPortfolioCatalog _portfolio;
    private readonly IReadOnlyList<AppDefinition> _apps;
    private readonly Dictionary<string, AppDefinition> _byId;

    [GeneratedRegex("^[a-z0-9-]{1,40}$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex SafeIdRegex();

    public AppCatalog(IPortfolioCatalog portfolio)
    {
        _portfolio = portfolio;
        _apps =
        [
            new AppDefinition
            {
                Id = "explorer",
                Title = "Exploring - C:\\",
                Icon = "explorer",
                Content = AppContentKind.Client,
                DefaultWidth = 680,
                DefaultHeight = 440,
                MinWidth = 360,
                MinHeight = 260,
                MultiInstance = true,
            },
            new AppDefinition
            {
                Id = "projects",
                Title = "Projects - C:\\Projects",
                Icon = "projects",
                Content = AppContentKind.Fragment,
                DefaultWidth = 680,
                DefaultHeight = 450,
                MinWidth = 360,
                MinHeight = 260,
                MultiInstance = false,
                Route = "/projects",
            },
            new AppDefinition
            {
                Id = "project",
                Title = "Project Details",
                Icon = "project",
                Content = AppContentKind.Fragment,
                DefaultWidth = 660,
                DefaultHeight = 470,
                MinWidth = 360,
                MinHeight = 280,
                MultiInstance = true,
                Route = "/projects/{slug}",
                Hidden = true,
            },
            new AppDefinition
            {
                Id = "resume",
                Title = "Resume.doc - WordPad",
                Icon = "resume",
                Content = AppContentKind.Fragment,
                DefaultWidth = 680,
                DefaultHeight = 480,
                MinWidth = 360,
                MinHeight = 280,
                MultiInstance = false,
                Route = "/resume",
            },
            new AppDefinition
            {
                Id = "sysprops",
                Title = "System Properties",
                Icon = "system",
                Content = AppContentKind.Fragment,
                DefaultWidth = 540,
                DefaultHeight = 460,
                MinWidth = 360,
                MinHeight = 320,
                MultiInstance = false,
                Route = "/skills",
            },
            new AppDefinition
            {
                Id = "iexplore",
                Title = "Microsoft Internet Explorer",
                Icon = "iexplore",
                Content = AppContentKind.Client,
                DefaultWidth = 700,
                DefaultHeight = 470,
                MinWidth = 380,
                MinHeight = 280,
                MultiInstance = true,
            },
            new AppDefinition
            {
                Id = "linkedin",
                Title = "Pedro Tunin - LinkedIn",
                Icon = "linkedin",
                Content = AppContentKind.Fragment,
                DefaultWidth = 660,
                DefaultHeight = 480,
                MinWidth = 360,
                MinHeight = 280,
                MultiInstance = false,
            },
            new AppDefinition
            {
                Id = "github",
                Title = "Pedro Tunin (@Pedroltz) - GitHub",
                Icon = "github",
                Content = AppContentKind.Fragment,
                DefaultWidth = 680,
                DefaultHeight = 500,
                MinWidth = 360,
                MinHeight = 280,
                MultiInstance = false,
            },
            new AppDefinition
            {
                Id = "minesweeper",
                Title = "Minesweeper",
                Icon = "minesweeper",
                Content = AppContentKind.Client,
                DefaultWidth = 280,
                DefaultHeight = 360,
                MinWidth = 240,
                MinHeight = 310,
                Resizable = true,
                Maximizable = false,
                MultiInstance = false,
            },
            new AppDefinition
            {
                Id = "notepad",
                Title = "Readme.txt - Notepad",
                Icon = "notepad",
                Content = AppContentKind.Client,
                DefaultWidth = 520,
                DefaultHeight = 380,
                MinWidth = 280,
                MinHeight = 200,
                MultiInstance = true,
            },
            new AppDefinition
            {
                Id = "about",
                Title = "About PedroOS 95",
                Icon = "logo",
                Content = AppContentKind.Fragment,
                DefaultWidth = 440,
                DefaultHeight = 360,
                MinWidth = 340,
                MinHeight = 280,
                Resizable = false,
                Maximizable = false,
                MultiInstance = false,
            },
            new AppDefinition
            {
                Id = "find",
                Title = "Find: All Files",
                Icon = "find",
                Content = AppContentKind.Client,
                DefaultWidth = 480,
                DefaultHeight = 360,
                MinWidth = 340,
                MinHeight = 260,
                MultiInstance = false,
            },
            new AppDefinition
            {
                Id = "run",
                Title = "Run",
                Icon = "run",
                Content = AppContentKind.Client,
                DefaultWidth = 370,
                DefaultHeight = 200,
                MinWidth = 320,
                MinHeight = 180,
                Resizable = false,
                Maximizable = false,
                MultiInstance = false,
                Hidden = true,
            },
            new AppDefinition
            {
                Id = "display",
                Title = "Display Properties",
                Icon = "display",
                Content = AppContentKind.Client,
                DefaultWidth = 420,
                DefaultHeight = 370,
                MinWidth = 340,
                MinHeight = 310,
                Resizable = false,
                Maximizable = false,
                MultiInstance = false,
            },
            new AppDefinition
            {
                Id = "shutdown",
                Title = "Shut Down PedroOS",
                Icon = "shutdown",
                Content = AppContentKind.Client,
                DefaultWidth = 360,
                DefaultHeight = 230,
                MinWidth = 320,
                MinHeight = 210,
                Resizable = false,
                Maximizable = false,
                MultiInstance = false,
                Hidden = true,
            },
        ];

        _byId = _apps.ToDictionary(a => a.Id, StringComparer.OrdinalIgnoreCase);
    }

    public IReadOnlyList<AppDefinition> GetAll() => _apps;

    public bool IsValidAppId(string? appId) =>
        !string.IsNullOrWhiteSpace(appId) && SafeIdRegex().IsMatch(appId) && _byId.ContainsKey(appId);

    public AppDefinition? GetById(string? appId) =>
        IsValidAppId(appId) ? _byId[appId!] : null;

    public RouteResolution? ResolveRoute(string? path)
    {
        var normalized = NormalizeRoute(path);
        if (normalized == "/")
        {
            return new RouteResolution(
                AppId: string.Empty,
                Args: null,
                PageTitle: "PedroOS 95 — Portfólio Interativo de Pedro Tunin",
                MetaDescription: "Portfólio profissional interativo de Pedro Tunin que simula o sistema operacional Windows 95 com projetos reais (.NET 10, Python, Linux/DevOps e IA), currículo e aplicativos funcionais.",
                CanonicalPath: "/");
        }

        if (string.Equals(normalized, "/projects", StringComparison.OrdinalIgnoreCase))
        {
            return new RouteResolution(
                AppId: "projects",
                Args: null,
                PageTitle: "Projetos — PedroOS 95 (Pedro Tunin)",
                MetaDescription: "Catálogo de projetos de software de Pedro Tunin: Ofizzy (.NET 10, Angular, PostgreSQL), RDP Session Manager (Python, GTK 4, Linux xrdp), ZellaPedia e mais.",
                CanonicalPath: "/projects");
        }

        if (normalized.StartsWith("/projects/", StringComparison.OrdinalIgnoreCase))
        {
            var slug = normalized["/projects/".Length..].Trim('/');
            var project = _portfolio.GetProjectBySlug(slug);
            if (project is null)
            {
                return null;
            }

            return new RouteResolution(
                AppId: "project",
                Args: new Dictionary<string, string> { ["slug"] = project.Slug },
                PageTitle: $"{project.Name} — Projetos — PedroOS 95",
                MetaDescription: project.Summary,
                CanonicalPath: $"/projects/{project.Slug}");
        }

        if (string.Equals(normalized, "/resume", StringComparison.OrdinalIgnoreCase))
        {
            return new RouteResolution(
                AppId: "resume",
                Args: null,
                PageTitle: "Currículo (Resume.doc) — Pedro Tunin — PedroOS 95",
                MetaDescription: "Currículo profissional de Pedro Tunin: experiência em Engenharia de Software (.NET, Python, TypeScript/Angular, Linux, Docker, CI/CD e Inteligência Artificial).",
                CanonicalPath: "/resume");
        }

        if (string.Equals(normalized, "/skills", StringComparison.OrdinalIgnoreCase))
        {
            return new RouteResolution(
                AppId: "sysprops",
                Args: new Dictionary<string, string> { ["tab"] = "dev" },
                PageTitle: "System Properties (Habilidades Técnicas) — PedroOS 95",
                MetaDescription: "Propriedades do Sistema de Pedro Tunin: competências em Desenvolvimento (C#, .NET, ASP.NET Core, Python, TypeScript, Angular, SQL), DevOps/Linux e Inteligência Artificial.",
                CanonicalPath: "/skills");
        }

        return null;
    }

    private static string NormalizeRoute(string? path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return "/";
        }

        var trimmed = path.Split('?', '#')[0].Trim();
        if (!trimmed.StartsWith('/'))
        {
            trimmed = "/" + trimmed;
        }

        return trimmed.Length > 1 ? trimmed.TrimEnd('/') : "/";
    }
}
