using RetroGame2091.Services;
using RetroGame2091.Utils;
using System.Text;
using static RetroGame2091.Utils.InstallationResult;

namespace RetroGame2091
{
    class Program
    {
        static async Task Main(string[] args)
        {
            // Configure UTF-8 encoding BEFORE any console output
            Console.OutputEncoding = Encoding.UTF8;
            Console.InputEncoding = Encoding.UTF8;

            // Register code pages encoding provider for extended character support
            Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

            // Check and install FFmpeg if needed
            var installationResult = await FFmpegInstaller.CheckAndInstallFFmpegAsync();

            switch (installationResult)
            {
                case InstallationResult.InstallationFailed:
                    Console.WriteLine("FFmpeg é necessário para executar este jogo. Por favor, instale o FFmpeg manualmente e tente novamente.");
                    Console.WriteLine("Pressione qualquer tecla para sair...");
                    Console.ReadKey();
                    return;

                case InstallationResult.InstallationSuccessfulRequiresRestart:
                    FFmpegInstaller.RestartApplication();
                    return;

                case InstallationResult.AlreadyInstalled:
                case InstallationResult.InstallationSuccessful:
                    // Continue with normal execution
                    break;
            }

            // Setup dependency injection container
            var serviceContainer = new ServiceContainer();
            serviceContainer.RegisterServices();

            // Get the game controller and run the game
            var gameController = serviceContainer.GetService<GameController>();
            await gameController.Run();
        }
    }
}