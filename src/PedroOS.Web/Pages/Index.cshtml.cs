using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using PedroOS.Web.Models;
using PedroOS.Web.Services;

namespace PedroOS.Web.Pages;

public sealed class IndexModel(
    IAppCatalog appCatalog,
    IPortfolioCatalog portfolio,
    IVirtualFileSystem vfs,
    IIconRegistry icons) : PageModel
{
    private static readonly JsonSerializerOptions BootJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };

    public string? InitialAppId { get; private set; }
    public IReadOnlyDictionary<string, string>? InitialArgs { get; private set; }
    public AppDefinition? InitialApp { get; private set; }
    public Project? InitialProject { get; private set; }
    public string InitialWindowTitle { get; private set; } = string.Empty;
    public string InitialWindowIcon { get; private set; } = "exe";
    public bool IsNotFoundRoute { get; private set; }
    public string BootDataJson { get; private set; } = "{}";

    public IActionResult OnGet(string? slug = null)
    {
        var requestPath = HttpContext.Request.Path.Value ?? "/";
        var resolution = appCatalog.ResolveRoute(requestPath);

        if (resolution is null)
        {
            Response.StatusCode = StatusCodes.Status404NotFound;
            IsNotFoundRoute = true;
            ViewData["Title"] = "404 — Arquivo ou Rota Não Encontrada — PedroOS 95";
            ViewData["MetaDescription"] = "A rota solicitada não foi encontrada no PedroOS 95.";
            ViewData["CanonicalPath"] = "/";
        }
        else
        {
            ViewData["Title"] = resolution.PageTitle;
            ViewData["MetaDescription"] = resolution.MetaDescription;
            ViewData["CanonicalPath"] = resolution.CanonicalPath;

            if (!string.IsNullOrEmpty(resolution.AppId))
            {
                InitialAppId = resolution.AppId;
                InitialArgs = resolution.Args;
                InitialApp = appCatalog.GetById(resolution.AppId);
                if (InitialApp is not null)
                {
                    InitialWindowTitle = InitialApp.Title;
                    InitialWindowIcon = InitialApp.Icon;
                }

                if (resolution.AppId == "project" &&
                    resolution.Args is not null &&
                    resolution.Args.TryGetValue("slug", out var projectSlug))
                {
                    InitialProject = portfolio.GetProjectBySlug(projectSlug);
                    if (InitialProject is not null)
                    {
                        InitialWindowTitle = $"{InitialProject.Name} ({InitialProject.ExecutableName})";
                        InitialWindowIcon = InitialProject.Icon;
                    }
                }
            }
        }

        var bootPayload = new
        {
            apps = appCatalog.GetAll(),
            vfsRoot = vfs.GetRoot(),
            icons = icons.All,
            projects = portfolio.GetProjects().Select(p => new
            {
                p.Slug,
                p.Name,
                p.ExecutableName,
                p.Icon,
                p.Summary,
                p.Stack,
                p.RepositoryUrl,
                p.DemoUrl,
                p.Featured,
            }),
            initialRoute = new
            {
                path = requestPath,
                appId = InitialAppId,
                args = InitialArgs,
                notFound = IsNotFoundRoute,
            },
        };

        BootDataJson = JsonSerializer.Serialize(bootPayload, BootJsonOptions)
            .Replace("</", "<\\/", StringComparison.Ordinal);

        return Page();
    }
}
