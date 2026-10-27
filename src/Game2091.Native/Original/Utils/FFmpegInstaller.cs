using System.Diagnostics;
using System.Runtime.InteropServices;

namespace RetroGame2091.Utils
{
    public enum OperatingSystemType
    {
        Windows,
        Linux,
        MacOS,
        Unknown
    }

    public enum LinuxDistribution
    {
        Debian,
        Ubuntu,
        Fedora,
        Arch,
        Unknown
    }

    public enum InstallationResult
    {
        AlreadyInstalled,
        InstallationSuccessful,
        InstallationFailed,
        InstallationSuccessfulRequiresRestart
    }

    public static class FFmpegInstaller
    {
        public static async Task<InstallationResult> CheckAndInstallFFmpegAsync()
        {
            if (IsFFmpegInstalled())
            {
                Console.WriteLine("FFmpeg já está instalado.");
                return InstallationResult.AlreadyInstalled;
            }

            Console.WriteLine("FFmpeg não encontrado. Iniciando instalação automática...");
            
            var osType = GetOperatingSystemType();
            
            switch (osType)
            {
                case OperatingSystemType.Windows:
                    return await InstallFFmpegWindowsAsync();
                case OperatingSystemType.Linux:
                    return await InstallFFmpegLinuxAsync();
                case OperatingSystemType.MacOS:
                    Console.WriteLine("Instalação automática no macOS não suportada. Por favor, instale o FFmpeg manualmente usando: brew install ffmpeg");
                    return InstallationResult.InstallationFailed;
                default:
                    Console.WriteLine("Sistema operacional não suportado para instalação automática.");
                    return InstallationResult.InstallationFailed;
            }
        }

        public static void RestartApplication()
        {
            var osType = GetOperatingSystemType();
            var currentExecutable = Environment.ProcessPath ?? System.Reflection.Assembly.GetExecutingAssembly().Location;
            
            if (string.IsNullOrEmpty(currentExecutable))
            {
                Console.WriteLine("Não foi possível determinar o caminho do executável. Por favor, reinicie manualmente.");
                return;
            }

            Console.WriteLine("Reiniciando a aplicação para carregar as novas variáveis de ambiente...");
            Console.WriteLine("Pressione qualquer tecla para continuar...");
            Console.ReadKey();

            try
            {
                if (osType == OperatingSystemType.Windows)
                {
                    RestartApplicationWindows(currentExecutable);
                }
                else
                {
                    RestartApplicationUnix(currentExecutable);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erro ao reiniciar automaticamente: {ex.Message}");
                Console.WriteLine("Por favor, feche e abra novamente o terminal, em seguida execute 'dotnet run' novamente.");
                Console.WriteLine("Pressione qualquer tecla para sair...");
                Console.ReadKey();
            }

            Environment.Exit(0);
        }

        private static void RestartApplicationWindows(string executablePath)
        {
            var processInfo = new ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = $"/c timeout 2 && \"{executablePath}\"",
                UseShellExecute = true,
                CreateNoWindow = false
            };

            if (executablePath.EndsWith(".dll"))
            {
                processInfo.FileName = "cmd.exe";
                processInfo.Arguments = $"/c timeout 2 && dotnet \"{executablePath}\"";
            }

            Process.Start(processInfo);
        }

        private static void RestartApplicationUnix(string executablePath)
        {
            var processInfo = new ProcessStartInfo
            {
                FileName = "/bin/bash",
                Arguments = $"-c \"sleep 2 && '{executablePath}'\"",
                UseShellExecute = false,
                CreateNoWindow = true
            };

            if (executablePath.EndsWith(".dll"))
            {
                processInfo.Arguments = $"-c \"sleep 2 && dotnet '{executablePath}'\"";
            }

            Process.Start(processInfo);
        }

        private static bool IsFFmpegInstalled()
        {
            try
            {
                var processInfo = new ProcessStartInfo
                {
                    FileName = "ffmpeg",
                    Arguments = "-version",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var process = Process.Start(processInfo);
                if (process != null)
                {
                    process.WaitForExit();
                    return process.ExitCode == 0;
                }
            }
            catch
            {
                // FFmpeg não encontrado
            }

            return false;
        }

        private static OperatingSystemType GetOperatingSystemType()
        {
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
                return OperatingSystemType.Windows;
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
                return OperatingSystemType.Linux;
            if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
                return OperatingSystemType.MacOS;
            
            return OperatingSystemType.Unknown;
        }

        private static async Task<InstallationResult> InstallFFmpegWindowsAsync()
        {
            Console.WriteLine("Tentando instalar FFmpeg usando winget...");
            
            try
            {
                var processInfo = new ProcessStartInfo
                {
                    FileName = "winget",
                    Arguments = "install --id=Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements",
                    UseShellExecute = false,
                    CreateNoWindow = false
                };

                using var process = Process.Start(processInfo);
                if (process != null)
                {
                    await process.WaitForExitAsync();
                    
                    if (process.ExitCode == 0)
                    {
                        Console.WriteLine("FFmpeg instalado com sucesso!");
                        Console.WriteLine("É necessário reiniciar a aplicação para carregar as variáveis de ambiente.");
                        return InstallationResult.InstallationSuccessfulRequiresRestart;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erro ao instalar FFmpeg: {ex.Message}");
                Console.WriteLine("Por favor, instale o FFmpeg manualmente em: https://ffmpeg.org/download.html");
            }

            return InstallationResult.InstallationFailed;
        }

        private static async Task<InstallationResult> InstallFFmpegLinuxAsync()
        {
            var distro = GetLinuxDistribution();
            
            switch (distro)
            {
                case LinuxDistribution.Debian:
                case LinuxDistribution.Ubuntu:
                    return await InstallFFmpegDebianAsync();
                case LinuxDistribution.Fedora:
                    return await InstallFFmpegFedoraAsync();
                case LinuxDistribution.Arch:
                    return await InstallFFmpegArchAsync();
                default:
                    Console.WriteLine("Distribuição Linux não suportada para instalação automática.");
                    Console.WriteLine("Por favor, instale o FFmpeg manualmente usando o gerenciador de pacotes da sua distribuição.");
                    return InstallationResult.InstallationFailed;
            }
        }

        private static LinuxDistribution GetLinuxDistribution()
        {
            try
            {
                if (File.Exists("/etc/os-release"))
                {
                    var content = File.ReadAllText("/etc/os-release").ToLower();
                    
                    if (content.Contains("ubuntu"))
                        return LinuxDistribution.Ubuntu;
                    if (content.Contains("debian"))
                        return LinuxDistribution.Debian;
                    if (content.Contains("fedora"))
                        return LinuxDistribution.Fedora;
                    if (content.Contains("arch"))
                        return LinuxDistribution.Arch;
                }
            }
            catch
            {
                // Erro ao ler arquivo
            }

            return LinuxDistribution.Unknown;
        }

        private static async Task<InstallationResult> InstallFFmpegDebianAsync()
        {
            Console.WriteLine("Tentando instalar FFmpeg usando apt...");
            
            try
            {
                var updateInfo = new ProcessStartInfo
                {
                    FileName = "sudo",
                    Arguments = "apt update",
                    UseShellExecute = false,
                    CreateNoWindow = false
                };

                using var updateProcess = Process.Start(updateInfo);
                if (updateProcess != null)
                {
                    await updateProcess.WaitForExitAsync();
                }

                var installInfo = new ProcessStartInfo
                {
                    FileName = "sudo",
                    Arguments = "apt install -y ffmpeg",
                    UseShellExecute = false,
                    CreateNoWindow = false
                };

                using var installProcess = Process.Start(installInfo);
                if (installProcess != null)
                {
                    await installProcess.WaitForExitAsync();
                    
                    if (installProcess.ExitCode == 0)
                    {
                        Console.WriteLine("FFmpeg instalado com sucesso!");
                        Console.WriteLine("Reiniciando a aplicação para garantir que o FFmpeg seja reconhecido...");
                        return InstallationResult.InstallationSuccessfulRequiresRestart;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erro ao instalar FFmpeg: {ex.Message}");
            }

            return InstallationResult.InstallationFailed;
        }

        private static async Task<InstallationResult> InstallFFmpegFedoraAsync()
        {
            Console.WriteLine("Tentando instalar FFmpeg usando dnf...");
            
            try
            {
                var processInfo = new ProcessStartInfo
                {
                    FileName = "sudo",
                    Arguments = "dnf install -y ffmpeg",
                    UseShellExecute = false,
                    CreateNoWindow = false
                };

                using var process = Process.Start(processInfo);
                if (process != null)
                {
                    await process.WaitForExitAsync();
                    
                    if (process.ExitCode == 0)
                    {
                        Console.WriteLine("FFmpeg instalado com sucesso!");
                        Console.WriteLine("Reiniciando a aplicação para garantir que o FFmpeg seja reconhecido...");
                        return InstallationResult.InstallationSuccessfulRequiresRestart;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erro ao instalar FFmpeg: {ex.Message}");
            }

            return InstallationResult.InstallationFailed;
        }

        private static async Task<InstallationResult> InstallFFmpegArchAsync()
        {
            Console.WriteLine("Tentando instalar FFmpeg usando pacman...");
            
            try
            {
                var processInfo = new ProcessStartInfo
                {
                    FileName = "sudo",
                    Arguments = "pacman -S --noconfirm ffmpeg",
                    UseShellExecute = false,
                    CreateNoWindow = false
                };

                using var process = Process.Start(processInfo);
                if (process != null)
                {
                    await process.WaitForExitAsync();
                    
                    if (process.ExitCode == 0)
                    {
                        Console.WriteLine("FFmpeg instalado com sucesso!");
                        Console.WriteLine("Reiniciando a aplicação para garantir que o FFmpeg seja reconhecido...");
                        return InstallationResult.InstallationSuccessfulRequiresRestart;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erro ao instalar FFmpeg: {ex.Message}");
            }

            return InstallationResult.InstallationFailed;
        }
    }
}