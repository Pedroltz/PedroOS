using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using PedroOS.Web.Models;
using PedroOS.Web.Services;

namespace PedroOS.Web.Pages.Apps;

public sealed class WindowFragmentModel(IAppCatalog appCatalog, IPortfolioCatalog portfolio) : PageModel
{
    public string AppId { get; private set; } = string.Empty;
    public Project? SelectedProject { get; private set; }

    public IActionResult OnGet(string appId, [FromQuery] string? slug = null)
    {
        var app = appCatalog.GetById(appId);
        if (app is null || app.Content != AppContentKind.Fragment)
        {
            return NotFound();
        }

        AppId = app.Id;
        if (AppId == "project")
        {
            SelectedProject = portfolio.GetProjectBySlug(slug);
            if (SelectedProject is null)
            {
                return NotFound();
            }
        }

        return Page();
    }
}
