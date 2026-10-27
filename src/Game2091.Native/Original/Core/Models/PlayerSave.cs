using Newtonsoft.Json;

namespace RetroGame2091.Core.Models
{
    public class PlayerSave
    {
        public Protagonist Character { get; set; } = new Protagonist();
        
        public static PlayerSave LoadSave()
        {
            try
            {
                string savePath = Path.Combine("Saves", "player.json");
                if (File.Exists(savePath))
                {
                    string json = File.ReadAllText(savePath);
                    return JsonConvert.DeserializeObject<PlayerSave>(json) ?? new PlayerSave();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading save: {ex.Message}");
            }
            
            return new PlayerSave();
        }
        
        public void SaveGame()
        {
            try
            {
                string savePath = Path.Combine("Saves", "player.json");
                Directory.CreateDirectory(Path.GetDirectoryName(savePath)!);
                Character.LastPlayed = DateTime.Now;
                string json = JsonConvert.SerializeObject(this, Formatting.Indented);
                File.WriteAllText(savePath, json);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error saving game: {ex.Message}");
            }
        }
    }
}