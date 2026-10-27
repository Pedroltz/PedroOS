using Newtonsoft.Json;

namespace RetroGame2091.Core.Models
{
    public class Colors
    {
        public string Title { get; set; } = "Cyan";
        public string NormalText { get; set; } = "White";
        public string HighlightedText { get; set; } = "Yellow";
        public string Options { get; set; } = "Green";
        public string Error { get; set; } = "Red";
        public string Background { get; set; } = "Black";
    }

    public class Settings
    {
        public int TextSpeed { get; set; } = 50;
        public bool ClearScreen { get; set; } = true;
        public bool SoundEnabled { get; set; } = false;
        public bool ShowHints { get; set; } = true;
    }

    public class GameConfig
    {
        public Colors Colors { get; set; } = new Colors();
        public Settings Settings { get; set; } = new Settings();

        public static GameConfig LoadConfig()
        {
            try
            {
                string configPath = Path.Combine("Config", "config.json");
                if (File.Exists(configPath))
                {
                    string json = File.ReadAllText(configPath);
                    return JsonConvert.DeserializeObject<GameConfig>(json) ?? new GameConfig();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading configuration: {ex.Message}");
            }
            
            return new GameConfig();
        }

        public void SaveConfig()
        {
            try
            {
                string configPath = Path.Combine("Config", "config.json");
                Directory.CreateDirectory(Path.GetDirectoryName(configPath)!);
                string json = JsonConvert.SerializeObject(this, Formatting.Indented);
                File.WriteAllText(configPath, json);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error saving configuration: {ex.Message}");
            }
        }

        public ConsoleColor GetColor(string colorName)
        {
            return colorName.ToLower() switch
            {
                "black" => ConsoleColor.Black,
                "darkblue" => ConsoleColor.DarkBlue,
                "darkgreen" => ConsoleColor.DarkGreen,
                "darkcyan" => ConsoleColor.DarkCyan,
                "darkred" => ConsoleColor.DarkRed,
                "darkmagenta" => ConsoleColor.DarkMagenta,
                "darkyellow" => ConsoleColor.DarkYellow,
                "gray" => ConsoleColor.Gray,
                "darkgray" => ConsoleColor.DarkGray,
                "blue" => ConsoleColor.Blue,
                "green" => ConsoleColor.Green,
                "cyan" => ConsoleColor.Cyan,
                "red" => ConsoleColor.Red,
                "magenta" => ConsoleColor.Magenta,
                "yellow" => ConsoleColor.Yellow,
                "white" => ConsoleColor.White,
                _ => ConsoleColor.White
            };
        }
    }
}