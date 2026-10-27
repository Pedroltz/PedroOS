namespace RetroGame2091.Core.Models
{
    public class Protagonist
    {
        public string Name { get; set; } = "Alex";
        public Attributes Attributes { get; set; } = new Attributes();
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime LastPlayed { get; set; } = DateTime.Now;
        public int PlaytimeMinutes { get; set; } = 0;
        public string CurrentChapter { get; set; } = "init_inicio";
        public string? CurrentNode { get; set; } = null;
        public Dictionary<string, object> CustomData { get; set; } = new Dictionary<string, object>();
        public List<InventoryItem> Inventory { get; set; } = new List<InventoryItem>();

        // NPC conversation history
        public Dictionary<string, ChatSession> NPCConversations { get; set; } = new Dictionary<string, ChatSession>();

        [Newtonsoft.Json.JsonIgnore]
        public DateTime SessionStartTime { get; set; } = DateTime.Now;
    }
}