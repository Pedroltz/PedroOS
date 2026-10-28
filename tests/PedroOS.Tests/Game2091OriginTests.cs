using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using PedroOS.Web.Services;

namespace PedroOS.Tests;

public class Game2091OriginTests
{
    [Theory]
    [InlineData("http", "phone.trycloudflare.com", "https://phone.trycloudflare.com", true)]
    [InlineData("http", "phone.trycloudflare.com", "https://PHONE.trycloudflare.com", true)]
    [InlineData("https", "phone.trycloudflare.com", "https://phone.trycloudflare.com", true)]
    [InlineData("http", "localhost:5159", "http://localhost:5159", true)]
    [InlineData("http", "phone.trycloudflare.com", "https://pedroltz.github.io", true)]
    [InlineData("http", "phone.trycloudflare.com", "https://other.trycloudflare.com", false)]
    [InlineData("http", "phone.trycloudflare.com", "https://phone.trycloudflare.com.evil.test", false)]
    [InlineData("http", "localhost:5159", "http://localhost:8080", false)]
    [InlineData("https", "phone.trycloudflare.com", "http://phone.trycloudflare.com", false)]
    [InlineData("http", "phone.trycloudflare.com", "https://user@phone.trycloudflare.com", false)]
    [InlineData("http", "phone.trycloudflare.com", "https://phone.trycloudflare.com/path", false)]
    [InlineData("http", "phone.trycloudflare.com", "https://phone.trycloudflare.com?query", false)]
    [InlineData("http", "phone.trycloudflare.com", "https://phone.trycloudflare.com#fragment", false)]
    [InlineData("http", "phone.trycloudflare.com", "", false)]
    [InlineData("http", "phone.trycloudflare.com", "null", false)]
    public void ValidatesBrowserOriginBehindTlsProxy(string scheme, string host, string origin, bool expected)
    {
        var environment = new Mock<IWebHostEnvironment>();
        environment.SetupGet(e => e.ContentRootPath).Returns(AppContext.BaseDirectory);
        using var service = new Game2091TerminalService(new ConfigurationBuilder().Build(),
            environment.Object, NullLogger<Game2091TerminalService>.Instance);
        var context = new DefaultHttpContext();
        context.Request.Scheme = scheme;
        context.Request.Host = new HostString(host);
        context.Request.Headers.Origin = origin;
        // A forged proxy header must not authorize an unrelated browser origin.
        context.Request.Headers["X-Forwarded-Host"] = "other.trycloudflare.com";
        context.Request.Headers["X-Forwarded-Proto"] = "https";

        Assert.Equal(expected, service.IsOriginAllowed(context.Request));
    }
}
