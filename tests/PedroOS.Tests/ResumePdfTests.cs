using System.Text;
using Microsoft.AspNetCore.Hosting;
using Moq;
using PedroOS.Web.Services;

namespace PedroOS.Tests;

public class ResumePdfTests
{
    private readonly ResumePdfService _pdfService;

    public ResumePdfTests()
    {
        var baseDir = AppContext.BaseDirectory;
        var dataDir = Path.Combine(baseDir, "..", "..", "..", "..", "..", "src", "PedroOS.Web", "Data");
        dataDir = Path.GetFullPath(dataDir);
        var portfolio = new JsonPortfolioCatalog(dataDir);
        var mockEnv = new Mock<IWebHostEnvironment>();
        mockEnv.Setup(e => e.WebRootPath).Returns(Path.Combine(dataDir, "..", "wwwroot"));
        _pdfService = new ResumePdfService(portfolio, mockEnv.Object);
    }

    [Fact]
    public void GetResumePdfBytes_GeneratesValidPdfDocument()
    {
        var bytes = _pdfService.GetResumePdfBytes();
        Assert.NotNull(bytes);
        Assert.True(bytes.Length > 200, "PDF must not be empty");

        var text = Encoding.ASCII.GetString(bytes);
        Assert.StartsWith("%PDF-1.4", text);
        Assert.Contains("%%EOF", text);
        Assert.Contains("Pedro Tunin", text);
    }
}
