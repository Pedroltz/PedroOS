using System.Text;
using Microsoft.AspNetCore.StaticFiles;
using PedroOS.Web.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<IIconRegistry, IconRegistry>();
builder.Services.AddSingleton<IPortfolioCatalog, JsonPortfolioCatalog>();
builder.Services.AddSingleton<IAppCatalog, AppCatalog>();
builder.Services.AddSingleton<IVirtualFileSystem, VirtualFileSystemService>();
builder.Services.AddSingleton<IResumePdfService, ResumePdfService>();
builder.Services.AddSingleton<Game2091TerminalService>();

builder.Services.AddRazorPages(options =>
{
    options.Conventions.AddPageRoute("/Index", "projects");
    options.Conventions.AddPageRoute("/Index", "projects/{slug}");
    options.Conventions.AddPageRoute("/Index", "resume");
    options.Conventions.AddPageRoute("/Index", "skills");
    options.Conventions.AddPageRoute("/Index", "not-found");
});

var app = builder.Build();

// Security headers middleware
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers.TryAdd("X-Content-Type-Options", "nosniff");
    headers.TryAdd("X-Frame-Options", "SAMEORIGIN");
    headers.TryAdd("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.TryAdd("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    headers.TryAdd(
        "Content-Security-Policy",
        (context.Request.Path.Equals("/assets/games/doom/player.html", StringComparison.OrdinalIgnoreCase)
            ? "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'"
            : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'"));

    await next();
});

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
}

app.UseWhen(context => !context.Request.Path.StartsWithSegments("/api"), branch => branch.UseStatusCodePagesWithReExecute("/not-found"));

var contentTypeProvider = new FileExtensionContentTypeProvider();
contentTypeProvider.Mappings[".cur"] = "image/x-icon";
contentTypeProvider.Mappings[".wad"] = "application/octet-stream";
contentTypeProvider.Mappings[".wasm"] = "application/wasm";
app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = contentTypeProvider,
    OnPrepareResponse = ctx =>
    {
        // Only content-versioned URLs can safely be immutable. Icons, fonts and
        // other stable URLs must be revalidated after a rebuild/deployment.
        ctx.Context.Response.Headers.CacheControl = app.Environment.IsDevelopment()
            ? "no-cache"
            : ctx.Context.Request.Query.ContainsKey("v")
                ? "public,max-age=604800,immutable"
                : "public,max-age=0,must-revalidate";
    },
});

app.UseRouting();
app.UseWebSockets(new WebSocketOptions { KeepAliveInterval = TimeSpan.FromSeconds(30), KeepAliveTimeout = TimeSpan.FromSeconds(20) });
app.MapGet("/api/game2091/status", (HttpContext context, Game2091TerminalService terminal) => Results.Ok(new { available = terminal.Available, busy = terminal.IsBusy(context) }));
app.Map("/api/game2091/terminal", (HttpContext context, Game2091TerminalService terminal) => terminal.HandleAsync(context));

app.MapGet("/resume/pdf", (IResumePdfService pdfService) =>
{
    var bytes = pdfService.GetResumePdfBytes();
    return Results.File(bytes, "application/pdf", "Pedro-Tunin-Resume.pdf");
});

app.MapGet("/robots.txt", (HttpContext ctx) =>
{
    var baseUrl = $"{ctx.Request.Scheme}://{ctx.Request.Host}";
    var txt = $"User-agent: *\nAllow: /\nSitemap: {baseUrl}/sitemap.xml\n";
    return Results.Text(txt, "text/plain", Encoding.UTF8);
});

app.MapGet("/sitemap.xml", (HttpContext ctx, IPortfolioCatalog portfolio) =>
{
    var baseUrl = $"{ctx.Request.Scheme}://{ctx.Request.Host}";
    var routes = new List<string> { "/", "/projects", "/resume", "/skills" };
    routes.AddRange(portfolio.GetProjects().Select(p => $"/projects/{p.Slug}"));

    var sb = new StringBuilder();
    sb.AppendLine("""<?xml version="1.0" encoding="utf-8"?>""");
    sb.AppendLine("""<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">""");
    foreach (var route in routes.Distinct(StringComparer.OrdinalIgnoreCase))
    {
        sb.AppendLine($"  <url><loc>{baseUrl}{route}</loc></url>");
    }
    sb.AppendLine("</urlset>");
    return Results.Text(sb.ToString(), "application/xml", Encoding.UTF8);
});

app.MapGet("/healthz", () => Results.Ok(new { status = "ok", os = "PedroOS 95" }));

app.MapPost("/api/internal/deploy", async (HttpContext ctx, IHostApplicationLifetime lifetime) =>
{
    var maxBodyFeature = ctx.Features.Get<Microsoft.AspNetCore.Http.Features.IHttpMaxRequestBodySizeFeature>();
    if (maxBodyFeature is { IsReadOnly: false })
    {
        maxBodyFeature.MaxRequestBodySize = 100_000_000;
    }

    var expected = Environment.GetEnvironmentVariable("PEDROOS_DEPLOY_TOKEN");
    if (string.IsNullOrWhiteSpace(expected))
    {
        return Results.StatusCode(503);
    }

    var provided = ctx.Request.Headers["X-Deploy-Token"].ToString();
    var expectedBytes = Encoding.UTF8.GetBytes(expected);
    var providedBytes = Encoding.UTF8.GetBytes(provided);
    if (!System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(expectedBytes, providedBytes))
    {
        return Results.Unauthorized();
    }

    var tempArchive = Path.Combine(Path.GetTempPath(), $"pedroos-deploy-{Guid.NewGuid():N}.tar.gz");
    try
    {
        await using (var fs = File.Create(tempArchive))
        {
            await ctx.Request.Body.CopyToAsync(fs, ctx.RequestAborted);
        }

        var targetDir = AppContext.BaseDirectory;
        using var proc = System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
        {
            FileName = "tar",
            ArgumentList = { "-xzf", tempArchive, "-C", targetDir },
            RedirectStandardError = true,
            UseShellExecute = false,
        });
        if (proc is null)
        {
            return Results.Problem("Failed to start tar process.");
        }

        var err = await proc.StandardError.ReadToEndAsync(ctx.RequestAborted);
        await proc.WaitForExitAsync(ctx.RequestAborted);
        if (proc.ExitCode != 0)
        {
            return Results.Problem($"tar exited with {proc.ExitCode}: {err}");
        }
    }
    finally
    {
        if (File.Exists(tempArchive))
        {
            File.Delete(tempArchive);
        }
    }

    _ = Task.Run(async () =>
    {
        await Task.Delay(800);
        lifetime.StopApplication();
    });

    return Results.Ok(new { status = "deployed", restarting = true });
});

app.MapRazorPages();

app.Run();

public partial class Program;
