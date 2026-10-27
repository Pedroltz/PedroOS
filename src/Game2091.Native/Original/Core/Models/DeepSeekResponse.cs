using Newtonsoft.Json;

namespace RetroGame2091.Core.Models
{
    /// <summary>
    /// DeepSeek API response structure
    /// </summary>
    public class DeepSeekResponse
    {
        [JsonProperty("id")]
        public string Id { get; set; } = "";

        [JsonProperty("choices")]
        public List<DeepSeekChoice> Choices { get; set; } = new List<DeepSeekChoice>();

        [JsonProperty("usage")]
        public DeepSeekUsage Usage { get; set; } = new DeepSeekUsage();
    }

    /// <summary>
    /// Choice structure in DeepSeek response
    /// </summary>
    public class DeepSeekChoice
    {
        [JsonProperty("message")]
        public DeepSeekMessage Message { get; set; } = new DeepSeekMessage();

        [JsonProperty("finish_reason")]
        public string FinishReason { get; set; } = "";
    }

    /// <summary>
    /// Token usage information
    /// </summary>
    public class DeepSeekUsage
    {
        [JsonProperty("prompt_tokens")]
        public int PromptTokens { get; set; }

        [JsonProperty("completion_tokens")]
        public int CompletionTokens { get; set; }

        [JsonProperty("total_tokens")]
        public int TotalTokens { get; set; }
    }
}
