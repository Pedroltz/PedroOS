using RetroGame2091.Core.Interfaces;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace RetroGame2091.Services
{
    public class MusicService : IMusicService, IDisposable
    {
        private Process? _ffplayProcess;
        private bool _isMusicPlaying;
        private readonly string _musicFilePath;
        private readonly bool _isWindows;
        private readonly bool _isLinux;
        private readonly string _ffplayCommand;

        public MusicService()
        {
            _musicFilePath = Path.Combine(Directory.GetCurrentDirectory(), "Sounds", "Menus", "Cyberpunk 2077 - Never Fade Away __ Knight972 ret..mp3");
            _isMusicPlaying = false;
            
            // Detect operating system
            _isWindows = RuntimeInformation.IsOSPlatform(OSPlatform.Windows);
            _isLinux = RuntimeInformation.IsOSPlatform(OSPlatform.Linux);
            
            // Set OS-specific commands
            if (_isWindows)
            {
                _ffplayCommand = "ffplay";
            }
            else if (_isLinux)
            {
                _ffplayCommand = GetLinuxFFplayPath();
            }
            else
            {
                // macOS or other Unix-like systems
                _ffplayCommand = "ffplay";
            }
            
            // Ensure music stops when application exits
            AppDomain.CurrentDomain.ProcessExit += OnProcessExit;
            
            // Console.CancelKeyPress may not work in all Linux terminals
            try
            {
                Console.CancelKeyPress += OnCancelKeyPress;
            }
            catch
            {
                // Ignore if CancelKeyPress is not supported
            }
        }

        private void OnProcessExit(object? sender, EventArgs e)
        {
            StopMusic();
        }

        private void OnCancelKeyPress(object? sender, ConsoleCancelEventArgs e)
        {
            StopMusic();
        }

        private string GetLinuxFFplayPath()
        {
            // Try common ffplay locations on Linux
            string[] possiblePaths = {
                "ffplay",           // If in PATH
                "/usr/bin/ffplay",
                "/usr/local/bin/ffplay",
                "/snap/bin/ffplay", // Snap package
                "flatpak run org.ffmpeg.ffplay" // Flatpak (needs special handling)
            };

            foreach (string path in possiblePaths)
            {
                if (path.StartsWith("flatpak"))
                    return path; // Return flatpak command as-is
                    
                if (IsCommandAvailable(path))
                    return path;
            }

            // Fallback to system ffplay
            return "ffplay";
        }

        private bool IsCommandAvailable(string command)
        {
            try
            {
                using var process = new Process();
                process.StartInfo = new ProcessStartInfo
                {
                    FileName = _isWindows ? "where" : "which",
                    Arguments = command,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };

                process.Start();
                process.WaitForExit();
                return process.ExitCode == 0;
            }
            catch
            {
                return false;
            }
        }

        private string GetCurrentUserUid()
        {
            try
            {
                using var process = new Process();
                process.StartInfo = new ProcessStartInfo
                {
                    FileName = "id",
                    Arguments = "-u",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };

                process.Start();
                var output = process.StandardOutput.ReadToEnd().Trim();
                process.WaitForExit();
                return process.ExitCode == 0 && !string.IsNullOrEmpty(output) ? output : "1000";
            }
            catch
            {
                return "1000"; // Default to user ID 1000
            }
        }

        public void StartTitleMusic()
        {
            if (_isMusicPlaying)
                return;

            try
            {
                ProcessStartInfo startInfo;
                
                if (_ffplayCommand.StartsWith("flatpak"))
                {
                    // Special handling for Flatpak
                    startInfo = new ProcessStartInfo
                    {
                        FileName = "flatpak",
                        Arguments = $@"run org.ffmpeg.ffplay -nodisp -volume 70 -loop 0 -autoexit -loglevel quiet ""{_musicFilePath}""",
                        UseShellExecute = false,
                        CreateNoWindow = !_isLinux, // Linux terminals may need visible process
                        RedirectStandardOutput = true,
                        RedirectStandardError = true
                    };
                }
                else
                {
                    // Volume 70% (-volume 70), no display window, loop forever, exit on file end
                    startInfo = new ProcessStartInfo
                    {
                        FileName = _ffplayCommand,
                        Arguments = $@"-nodisp -volume 70 -loop 0 -autoexit -loglevel quiet ""{_musicFilePath}""",
                        UseShellExecute = false,
                        CreateNoWindow = !_isLinux, // Linux terminals may need visible process
                        RedirectStandardOutput = true,
                        RedirectStandardError = true
                    };
                }

                // Platform-specific configurations
                if (_isWindows)
                {
                    startInfo.WindowStyle = ProcessWindowStyle.Hidden;
                }
                else if (_isLinux)
                {
                    // Set audio environment variables for Linux compatibility (PipeWire/PulseAudio)
                    var display = Environment.GetEnvironmentVariable("DISPLAY");
                    var xdgRuntimeDir = Environment.GetEnvironmentVariable("XDG_RUNTIME_DIR");

                    // Set DISPLAY for SDL
                    if (!string.IsNullOrEmpty(display))
                        startInfo.EnvironmentVariables["DISPLAY"] = display;
                    else
                        startInfo.EnvironmentVariables["DISPLAY"] = ":0";

                    // Set XDG_RUNTIME_DIR for PulseAudio socket discovery
                    if (!string.IsNullOrEmpty(xdgRuntimeDir))
                        startInfo.EnvironmentVariables["XDG_RUNTIME_DIR"] = xdgRuntimeDir;

                    // Force SDL to use PulseAudio (works with PipeWire's pulse emulation)
                    startInfo.EnvironmentVariables["SDL_AUDIODRIVER"] = "pulseaudio";

                    // Set PulseAudio server socket path for the current user
                    var uid = GetCurrentUserUid();
                    var pulseSocket = $"/run/user/{uid}/pulse/native";
                    if (File.Exists(pulseSocket))
                    {
                        startInfo.EnvironmentVariables["PULSE_SERVER"] = $"unix:{pulseSocket}";
                    }
                    else
                    {
                        // Try common locations
                        var commonPaths = new[] { "/run/user/1000/pulse/native", "/run/user/1001/pulse/native" };
                        foreach (var path in commonPaths)
                        {
                            if (File.Exists(path))
                            {
                                startInfo.EnvironmentVariables["PULSE_SERVER"] = $"unix:{path}";
                                break;
                            }
                        }
                    }
                }

                _ffplayProcess = Process.Start(startInfo);
                if (_ffplayProcess != null)
                {
                    _isMusicPlaying = true;
                    
                    // On Linux, detach from parent process to prevent terminal issues
                    if (_isLinux)
                    {
                        try
                        {
                            // Set process group to prevent it from receiving terminal signals
                            _ffplayProcess.EnableRaisingEvents = false;
                        }
                        catch
                        {
                            // Ignore if not supported
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                // Log error for debugging (can be removed in production)
                Console.Error.WriteLine($"[Music Service] Failed to start music: {ex.Message}");
                Console.Error.WriteLine($"[Music Service] Music file path: {_musicFilePath}");
                Console.Error.WriteLine($"[Music Service] File exists: {File.Exists(_musicFilePath)}");
                Console.Error.WriteLine($"[Music Service] FFplay command: {_ffplayCommand}");
                // Continue without music - not critical for gameplay
            }
        }

        public void StopMusic()
        {
            if (!_isMusicPlaying)
                return;

            try
            {
                // Kill the specific process first
                if (_ffplayProcess != null && !_ffplayProcess.HasExited)
                {
                    _ffplayProcess.Kill();
                    _ffplayProcess.WaitForExit(1000);
                }
                
                _ffplayProcess?.Dispose();
                _ffplayProcess = null;
                
                // Kill any remaining ffplay processes using OS-specific commands
                KillRemainingFFplayProcesses();
                
                _isMusicPlaying = false;
            }
            catch (Exception)
            {
                _isMusicPlaying = false;
            }
        }

        private void KillRemainingFFplayProcesses()
        {
            try
            {
                // OS-specific process killing
                if (_isWindows)
                {
                    KillWindowsFFplayProcesses();
                }
                else
                {
                    KillUnixFFplayProcesses();
                }
                
                // Also try to find and kill ffplay processes directly (cross-platform)
                var ffplayProcesses = Process.GetProcessesByName("ffplay");
                foreach (var process in ffplayProcesses)
                {
                    try
                    {
                        if (!process.HasExited)
                        {
                            process.Kill();
                            process.WaitForExit(1000);
                        }
                        process.Dispose();
                    }
                    catch
                    {
                        // Ignore individual process kill errors
                    }
                }
            }
            catch
            {
                // Ignore cleanup errors
            }
        }

        private void KillWindowsFFplayProcesses()
        {
            try
            {
                var killProcess = new ProcessStartInfo
                {
                    FileName = "taskkill",
                    Arguments = "/f /im ffplay.exe",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };
                
                using var kill = Process.Start(killProcess);
                kill?.WaitForExit(2000);
            }
            catch
            {
                // Ignore taskkill errors
            }
        }

        private void KillUnixFFplayProcesses()
        {
            try
            {
                // Try pkill first (most common on Linux)
                var pkillProcess = new ProcessStartInfo
                {
                    FileName = "pkill",
                    Arguments = "-f ffplay",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };
                
                using var pkill = Process.Start(pkillProcess);
                pkill?.WaitForExit(2000);
            }
            catch
            {
                try
                {
                    // Fallback to killall (if available)
                    var killallProcess = new ProcessStartInfo
                    {
                        FileName = "killall",
                        Arguments = "ffplay",
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true
                    };
                    
                    using var killall = Process.Start(killallProcess);
                    killall?.WaitForExit(2000);
                }
                catch
                {
                    // Ignore if neither pkill nor killall is available
                }
            }
        }

        public bool IsMusicPlaying()
        {
            return _isMusicPlaying;
        }

        public void Dispose()
        {
            StopMusic();
            AppDomain.CurrentDomain.ProcessExit -= OnProcessExit;
            Console.CancelKeyPress -= OnCancelKeyPress;
        }
    }
}