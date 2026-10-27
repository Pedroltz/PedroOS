using Newtonsoft.Json;

namespace RetroGame2091.Core.Models
{
    /// <summary>
    /// Individual message in a conversation
    /// </summary>
    public class ChatMessage
    {
        [JsonProperty("role")]
        public string Role { get; set; } = ""; // "user" or "assistant"

        [JsonProperty("content")]
        public string Content { get; set; } = "";

        [JsonProperty("timestamp")]
        public DateTime Timestamp { get; set; } = DateTime.Now;
    }
}
