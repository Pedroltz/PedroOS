using Newtonsoft.Json;

namespace RetroGame2091.Core.Models
{
    /// <summary>
    /// DeepSeek API request structure
    /// </summary>
    public class DeepSeekRequest
    {
        [JsonProperty("model")]
        public string Model { get; set; } = "deepseek-chat";

        [JsonProperty("messages")]
        public List<DeepSeekMessage> Messages { get; set; } = new List<DeepSeekMessage>();

        [JsonProperty("temperature")]
        public float Temperature { get; set; } = 0.7f;

        [JsonProperty("max_tokens")]
        public int MaxTokens { get; set; } = 300;
    }

    /// <summary>
    /// Message structure for DeepSeek API
    /// </summary>
    public class DeepSeekMessage
    {
        [JsonProperty("role")]
        public string Role { get; set; } = "";

        [JsonProperty("content")]
        public string Content { get; set; } = "";
    }
}
