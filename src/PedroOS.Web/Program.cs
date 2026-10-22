using System.Text;
using Microsoft.AspNetCore.StaticFiles;
using PedroOS.Web.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<IIconRegistry, IconRegistry>();
builder.Services.AddSingleton<IPortfolioCatalog, JsonPortfolioCatalog>();
builder.Services.AddSingleton<IAppCatalog, AppCatalog>();
builder.Services.AddSingleton<IVirtualFileSystem, VirtualFileSystemService>();
builder.Services.AddSingleton<IResumePdfService, ResumePdfService>();

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
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'");

    await next();
});

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
}

app.UseStatusCodePagesWithReExecute("/not-found");

var contentTypeProvider = new FileExtensionContentTypeProvider();
app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = contentTypeProvider,
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.CacheControl = "public,max-age=604800,immutable";
    },
});

app.UseRouting();

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

app.MapRazorPages();

app.Run();

public partial class Program;
