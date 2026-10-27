using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net.WebSockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace PedroOS.Web.Services;

public sealed class Game2091TerminalOptions
{
    public bool Enabled { get; set; } = true;
    public string GameDirectory { get; set; } = Path.Combine(AppContext.BaseDirectory, "game2091");
    public string DataDirectory { get; set; } = ".local-data/game2091";
    public string Python { get; set; } = "python3";
    public string[] AllowedOrigins { get; set; } = [];
    public int MaxSessions { get; set; } = 4;
    public int IdleMinutes { get; set; } = 15;
    public int LifetimeMinutes { get; set; } = 120;
}

public sealed class Game2091TerminalService : IDisposable
{
    private const string CookieName = "pedroos.2091.visitor";
    private readonly Game2091TerminalOptions _options;
    private readonly string _helper;
    private readonly string _dataRoot;
    private readonly ILogger<Game2091TerminalService> _logger;
    private readonly ConcurrentDictionary<string, byte> _active = new();
    private readonly SemaphoreSlim _slots;

    public Game2091TerminalService(IConfiguration configuration, IWebHostEnvironment environment, ILogger<Game2091TerminalService> logger)
    {
        _options = configuration.GetSection("Game2091").Get<Game2091TerminalOptions>() ?? new();
        _helper = Path.Combine(environment.ContentRootPath, "Terminal", "pty_host.py");
        _dataRoot = Path.GetFullPath(_options.DataDirectory, environment.ContentRootPath);
        _logger = logger;
        _slots = new SemaphoreSlim(Math.Clamp(_options.MaxSessions, 1, 32));
    }

    public bool Available => _options.Enabled && OperatingSystem.IsLinux()
        && File.Exists(Path.Combine(_options.GameDirectory, "Game2091.Native.dll")) && File.Exists(_helper);
    public bool IsBusy(HttpContext context) => context.Request.Cookies[CookieName] is { } visitor && _active.ContainsKey(visitor);

    public async Task HandleAsync(HttpContext context)
    {
        if (!Available) { context.Response.StatusCode = 503; return; }
        if (!context.WebSockets.IsWebSocketRequest) { context.Response.StatusCode = 400; return; }
        var origin = context.Request.Headers.Origin.ToString();
        var sameOrigin = $"{context.Request.Scheme}://{context.Request.Host}";
        if (!string.Equals(origin, sameOrigin, StringComparison.OrdinalIgnoreCase)
            && !_options.AllowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
        { context.Response.StatusCode = 403; return; }
        var visitor = context.Request.Cookies[CookieName];
        if (visitor is null || visitor.Length != 64 || visitor.Any(c => !char.IsAsciiHexDigit(c)))
        {
            visitor = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
            context.Response.Cookies.Append(CookieName, visitor, new CookieOptions
            { HttpOnly = true, Secure = context.Request.IsHttps, SameSite = SameSiteMode.Strict, Path = "/api/game2091", MaxAge = TimeSpan.FromDays(30), IsEssential = true });
        }
        if (!_active.TryAdd(visitor, 0)) { context.Response.StatusCode = 409; return; }
        if (!await _slots.WaitAsync(0, context.RequestAborted))
        { _active.TryRemove(visitor, out _); context.Response.StatusCode = 429; return; }
        try
        {
            var directory = PrepareVisitor(visitor);
            var cols = BoundDimension(context.Request.Query["cols"], 100, 80, 240);
            var rows = BoundDimension(context.Request.Query["rows"], 40, 30, 100);
            using var socket = await context.WebSockets.AcceptWebSocketAsync();
            using var lifetime = CancellationTokenSource.CreateLinkedTokenSource(context.RequestAborted);
            lifetime.CancelAfter(TimeSpan.FromMinutes(Math.Clamp(_options.LifetimeMinutes, 1, 240)));
            await RunAsync(socket, directory, cols, rows, lifetime);
        }
        catch (OperationCanceledException) { }
        catch (Exception error) { _logger.LogWarning(error, "2091 terminal session ended unexpectedly"); }
        finally { _active.TryRemove(visitor, out _); _slots.Release(); }
    }

    private string PrepareVisitor(string visitor)
    {
        Directory.CreateDirectory(_dataRoot);
        var directory = Path.Combine(_dataRoot, visitor);
        Directory.CreateDirectory(Path.Combine(directory, "Saves"));
        var configDirectory = Path.Combine(directory, "Config");
        Directory.CreateDirectory(configDirectory);
        var configFile = Path.Combine(configDirectory, "config.json");
        if (!File.Exists(configFile))
        {
            File.WriteAllText(configFile, """
                {"Colors":{"Title":"Cyan","NormalText":"White","HighlightedText":"Yellow","Options":"Green","Error":"Red","Background":"Black"},"Settings":{"TextSpeed":50,"ClearScreen":true,"SoundEnabled":false,"ShowHints":true}}
                """);
        }
        // Repair the instant-text default from the first hosted integration once per visitor.
        var defaultsVersion = Path.Combine(configDirectory, ".terminal-defaults-v2");
        if (!File.Exists(defaultsVersion))
        {
            var config = System.Text.Json.Nodes.JsonNode.Parse(File.ReadAllText(configFile));
            if (config?["Settings"]?["TextSpeed"]?.GetValue<int>() == 0)
            {
                config["Settings"]!["TextSpeed"] = 50;
                File.WriteAllText(configFile, config.ToJsonString());
            }
            File.WriteAllText(defaultsVersion, "2");
        }
        return directory;
    }

    private async Task RunAsync(WebSocket socket, string directory, int cols, int rows, CancellationTokenSource lifetime)
    {
        using var process = new Process { StartInfo = new ProcessStartInfo
        {
            FileName = _options.Python, UseShellExecute = false,
            RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true,
            WorkingDirectory = directory, StandardOutputEncoding = Encoding.UTF8, StandardErrorEncoding = Encoding.UTF8,
        }};
        foreach (var argument in new[] { _helper, "--game", Path.GetFullPath(Path.Combine(_options.GameDirectory, "Game2091.Native.dll")), "--cwd", directory, "--cols", cols.ToString(), "--rows", rows.ToString() }) process.StartInfo.ArgumentList.Add(argument);
        process.Start();
        var diagnostics = process.StandardError.ReadToEndAsync(lifetime.Token);
        var output = SendOutputAsync();
        var input = ReceiveInputAsync();
        try { await Task.WhenAny(output, input); }
        finally
        {
            // EOF lets the PTY helper send SIGHUP and reap the whole game process group.
            process.StandardInput.Close();
            try { await process.WaitForExitAsync().WaitAsync(TimeSpan.FromSeconds(4)); }
            catch (TimeoutException) { if (!process.HasExited) process.Kill(entireProcessTree: true); }
            await lifetime.CancelAsync();
            try { await Task.WhenAll(output, input); } catch (Exception e) when (e is OperationCanceledException or WebSocketException or IOException or ObjectDisposedException) { }
            try { await diagnostics; } catch (OperationCanceledException) { }
            if (socket.State is WebSocketState.Open or WebSocketState.CloseReceived)
            {
                using var close = new CancellationTokenSource(TimeSpan.FromSeconds(2));
                try { await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "2091 encerrado", close.Token); } catch (Exception e) when (e is WebSocketException or OperationCanceledException) { }
            }
        }

        async Task SendOutputAsync()
        {
            var connected = true;
            while (!lifetime.IsCancellationRequested)
            {
                var line = await process.StandardOutput.ReadLineAsync(lifetime.Token);
                if (line is null) return;
                // Keep draining after disconnect, so the PTY helper can see stdin EOF,
                // terminate the native process and reap it without a blocked output pipe.
                if (connected && socket.State == WebSocketState.Open)
                {
                    try { await socket.SendAsync(Encoding.UTF8.GetBytes(line), WebSocketMessageType.Text, true, lifetime.Token); }
                    catch (Exception error) when (error is WebSocketException or InvalidOperationException) { connected = false; }
                }
            }
        }
        async Task ReceiveInputAsync()
        {
            var bytes = new byte[16384];
            var lastKey = DateTime.UtcNow;
            var budget = 0;
            var interval = DateTime.UtcNow;
            while (socket.State == WebSocketState.Open && !lifetime.IsCancellationRequested)
            {
                using var idle = CancellationTokenSource.CreateLinkedTokenSource(lifetime.Token);
                // Input frames include terminal cursor-position responses; bound idle and total lifetime.
                idle.CancelAfter(TimeSpan.FromMinutes(Math.Clamp(_options.IdleMinutes, 1, 60)));
                var count = 0;
                WebSocketReceiveResult message;
                do
                {
                    message = await socket.ReceiveAsync(new ArraySegment<byte>(bytes, count, bytes.Length - count), idle.Token);
                    count += message.Count;
                    if (message.MessageType == WebSocketMessageType.Close) return;
                    if (count == bytes.Length || message.MessageType != WebSocketMessageType.Text) return;
                } while (!message.EndOfMessage);
                if ((DateTime.UtcNow - interval).TotalSeconds >= 1) { interval = DateTime.UtcNow; budget = 0; }
                if ((budget += count) > 65536) return;
                try
                {
                    using var json = JsonDocument.Parse(bytes.AsMemory(0, count));
                    var root = json.RootElement;
                    var kind = root.GetProperty("type").GetString();
                    string? forward = null;
                    if (kind == "input")
                    {
                        var data = root.GetProperty("data").GetString();
                        if (data is null || data.Length > 8192) return;
                        forward = JsonSerializer.Serialize(new { type = "input", data });
                        lastKey = DateTime.UtcNow;
                    }
                    else if (kind == "resize") forward = JsonSerializer.Serialize(new { type = "resize", cols = Math.Clamp(root.GetProperty("cols").GetInt32(), 80, 240), rows = Math.Clamp(root.GetProperty("rows").GetInt32(), 30, 100) });
                    else return;
                    if ((DateTime.UtcNow - lastKey).TotalMinutes > Math.Clamp(_options.IdleMinutes, 1, 60)) return;
                    await process.StandardInput.WriteLineAsync(forward.AsMemory(), lifetime.Token);
                    await process.StandardInput.FlushAsync(lifetime.Token);
                }
                catch (Exception e) when (e is JsonException or KeyNotFoundException or InvalidOperationException or FormatException) { return; }
            }
        }
    }
    private static int BoundDimension(string? value, int fallback, int min, int max) => int.TryParse(value, out var parsed) ? Math.Clamp(parsed, min, max) : fallback;
    public void Dispose() => _slots.Dispose();
}
