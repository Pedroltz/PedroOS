using Newtonsoft.Json;

namespace RetroGame2091.Core.Models
{
    /// <summary>
    /// Represents an ongoing or completed chat session with an NPC
    /// </summary>
    public class ChatSession
    {
        [JsonProperty("npc_id")]
        public string NPCId { get; set; } = "";

        [JsonProperty("messages")]
        public List<ChatMessage> Messages { get; set; } = new List<ChatMessage>();

        [JsonProperty("last_interaction")]
        public DateTime LastInteraction { get; set; } = DateTime.Now;

        [JsonProperty("message_count")]
        public int MessageCount { get; set; } = 0;

        [JsonProperty("is_active")]
        public bool IsActive { get; set; } = false;
    }
}
