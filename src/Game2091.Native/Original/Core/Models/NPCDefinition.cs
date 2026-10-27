using Newtonsoft.Json;

namespace RetroGame2091.Core.Models
{
    /// <summary>
    /// NPC personality and knowledge base loaded from NPCs/*.json
    /// </summary>
    public class NPCDefinition
    {
        [JsonProperty("id")]
        public string Id { get; set; } = "";

        [JsonProperty("name")]
        public string Name { get; set; } = "";

        [JsonProperty("role")]
        public string Role { get; set; } = "";

        [JsonProperty("personality")]
        public string Personality { get; set; } = "";

        [JsonProperty("appearance")]
        public string Appearance { get; set; } = "";

        [JsonProperty("background")]
        public string Background { get; set; } = "";

        [JsonProperty("known_topics")]
        public List<string> KnownTopics { get; set; } = new List<string>();

        [JsonProperty("unknown_topics")]
        public List<string> UnknownTopics { get; set; } = new List<string>();

        [JsonProperty("speech_pattern")]
        public string SpeechPattern { get; set; } = "";

        [JsonProperty("impatience_threshold")]
        public int ImpatienceThreshold { get; set; } = 15;

        [JsonProperty("impatience_cues")]
        public List<string> ImpatienceCues { get; set; } = new List<string>();

        [JsonProperty("location")]
        public string Location { get; set; } = "";

        [JsonProperty("related_factions")]
        public List<string> RelatedFactions { get; set; } = new List<string>();
    }
}
