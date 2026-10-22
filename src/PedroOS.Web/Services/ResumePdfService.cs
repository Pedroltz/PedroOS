using System.Globalization;
using System.Text;
using PedroOS.Web.Models;

namespace PedroOS.Web.Services;

public interface IResumePdfService
{
    byte[] GetResumePdfBytes();
}

/// <summary>
/// Generates a clean, valid PDF 1.4 document with standard Type1 fonts (Helvetica)
/// directly from Data/profile.json and Data/projects.json — or returns a static PDF if configured.
/// </summary>
public sealed class ResumePdfService : IResumePdfService
{
    private readonly IPortfolioCatalog _portfolio;
    private readonly IWebHostEnvironment _env;

    static ResumePdfService()
    {
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
    }

    public ResumePdfService(IPortfolioCatalog portfolio, IWebHostEnvironment env)
    {
        _portfolio = portfolio;
        _env = env;
    }

    public byte[] GetResumePdfBytes()
    {
        var profile = _portfolio.GetProfile();
        if (!string.IsNullOrWhiteSpace(profile.ResumePdf))
        {
            var candidate = Path.Combine(_env.WebRootPath, profile.ResumePdf.TrimStart('/', '\\'));
            if (File.Exists(candidate))
            {
                return File.ReadAllBytes(candidate);
            }
        }

        return GenerateFromProfile(profile, _portfolio.GetProjects(featuredOnly: true));
    }

    private static byte[] GenerateFromProfile(Profile profile, IReadOnlyList<Project> featuredProjects)
    {
        var lines = new List<(string Font, int Size, int Leading, string Text)>();
        void Heading(string text) => lines.Add(("F2", 12, 18, text.ToUpperInvariant()));
        void SubHeading(string text) => lines.Add(("F2", 10, 14, text));
        void Body(string text)
        {
            foreach (var wrapped in Wrap(text, 88))
            {
                lines.Add(("F1", 9, 12, wrapped));
            }
        }
        void Gap() => lines.Add(("F1", 6, 7, string.Empty));

        lines.Add(("F2", 16, 20, profile.Name));
        lines.Add(("F2", 10, 14, profile.Headline));
        var contactLine = string.Join("  |  ", profile.Links.Select(l => $"{l.Label}: {l.Url.Replace("mailto:", "")}"));
        Body($"{profile.Location}  |  {contactLine}");
        Gap();

        Heading("Resumo Profissional");
        Body(profile.Summary);
        Gap();

        Heading("Competencias Tecnicas");
        foreach (var group in profile.Competencies)
        {
            Body($"• {group.Name}: {string.Join(", ", group.Items)}");
        }
        Gap();

        Heading("Projetos em Destaque");
        foreach (var project in featuredProjects)
        {
            SubHeading($"{project.Name} — { string.Join(", ", project.Stack.Take(7)) }");
            Body(project.Summary);
            if (!string.IsNullOrWhiteSpace(project.RepositoryUrl))
            {
                Body($"Repositorio: {project.RepositoryUrl}");
            }
        }
        Gap();

        Heading("Historico Profissional");
        foreach (var exp in profile.Experience)
        {
            SubHeading($"{exp.Role} — {exp.Organization} ({exp.Period})");
            foreach (var b in exp.Bullets)
            {
                Body($"  - {b}");
            }
        }
        Gap();

        Heading("Formacao e Idiomas");
        foreach (var edu in profile.Education)
        {
            Body($"• {edu.Course} — {edu.Institution} ({edu.Period})");
        }
        if (profile.Languages.Count > 0)
        {
            Body($"• Idiomas: {string.Join(" | ", profile.Languages)}");
        }

        // Build content stream
        var sb = new StringBuilder();
        sb.AppendLine("BT");
        var y = 790;
        sb.AppendLine("48 790 Td");
        foreach (var (font, size, leading, text) in lines)
        {
            y -= leading;
            if (y < 42)
            {
                break;
            }
            sb.AppendFormat(CultureInfo.InvariantCulture, "/{0} {1} Tf 0 -{2} Td ({3}) Tj\n", font, size, leading, EscapePdf(text));
        }
        sb.AppendLine("ET");

        var win1252 = Encoding.GetEncoding(1252);
        var streamBytes = win1252.GetBytes(sb.ToString());

        using var ms = new MemoryStream();
        void WriteAscii(string s) => ms.Write(Encoding.ASCII.GetBytes(s));

        WriteAscii("%PDF-1.4\n");
        var offsets = new List<long>();

        void StartObj(int id)
        {
            offsets.Add(ms.Position);
            WriteAscii($"{id} 0 obj\n");
        }

        StartObj(1);
        WriteAscii("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

        StartObj(2);
        WriteAscii("<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

        StartObj(3);
        WriteAscii("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n");

        StartObj(4);
        WriteAscii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n");

        StartObj(5);
        WriteAscii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n");

        StartObj(6);
        WriteAscii($"<< /Length {streamBytes.Length} >>\nstream\n");
        ms.Write(streamBytes);
        WriteAscii("\nendstream\nendobj\n");

        var xrefPos = ms.Position;
        WriteAscii($"xref\n0 {offsets.Count + 1}\n0000000000 65535 f \n");
        foreach (var off in offsets)
        {
            WriteAscii($"{off:D10} 00000 n \n");
        }
        WriteAscii($"trailer\n<< /Size {offsets.Count + 1} /Root 1 0 R >>\nstartxref\n{xrefPos}\n%%EOF\n");
        return ms.ToArray();
    }

    private static IEnumerable<string> Wrap(string text, int maxCols)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            yield break;
        }

        var words = text.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var line = new StringBuilder();
        foreach (var w in words)
        {
            if (line.Length + w.Length + 1 > maxCols && line.Length > 0)
            {
                yield return line.ToString();
                line.Clear();
            }
            if (line.Length > 0)
            {
                line.Append(' ');
            }
            line.Append(w);
        }
        if (line.Length > 0)
        {
            yield return line.ToString();
        }
    }

    private static string EscapePdf(string input) =>
        input
            .Replace("—", "-")
            .Replace("•", "-")
            .Replace("→", "->")
            .Replace("\\", "\\\\")
            .Replace("(", "\\(")
            .Replace(")", "\\)");
}
