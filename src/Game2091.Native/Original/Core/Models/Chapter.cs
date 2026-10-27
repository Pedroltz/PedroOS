using Newtonsoft.Json;

namespace RetroGame2091.Core.Models
{
    public class SkillRequirement
    {
        public string Skill { get; set; } = "";
        public int MinValue { get; set; } = 0;
    }

    public class ItemDrop
    {
        public string ItemId { get; set; } = "";
        public int Quantity { get; set; } = 1;
    }

    public class ItemRequirement
    {
        public string ItemId { get; set; } = "";
        public int MinQuantity { get; set; } = 1;
    }

    public class Option
    {
        public string Text { get; set; } = "";
        public string NextChapter { get; set; } = "";
        public string NextNode { get; set; } = "";
        public Dictionary<string, object>? Conditions { get; set; }
        public SkillRequirement? SkillRequirement { get; set; }
        
        // Combat support
        public string? StartCombat { get; set; }
        public string? VictoryChapter { get; set; }
        public string? DefeatChapter { get; set; }
        public string? FleeChapter { get; set; }
        
        // Combat support for nodes (within same chapter)
        public string? VictoryNode { get; set; }
        public string? DefeatNode { get; set; }
        public string? FleeNode { get; set; }

        // Inventory support
        public List<ItemDrop>? GiveItems { get; set; }
        public List<ItemDrop>? RemoveItems { get; set; }
        public ItemRequirement? RequireItem { get; set; }

        // Chat support
        public string? StartChat { get; set; }
        public string? PostChatChapter { get; set; }
        public string? PostChatNode { get; set; }
    }

    public class ChapterNode
    {
        public List<string> Text { get; set; } = new List<string>();
        public List<Option> Options { get; set; } = new List<Option>();
        public string? NextNode { get; set; }
        public string? NextChapter { get; set; }
        public bool GameEnd { get; set; } = false;
    }

    public class Chapter
    {
        public string Id { get; set; } = "";
        public string Title { get; set; } = "";
        
        // Legacy format support (old structure)
        public List<string> Text { get; set; } = new List<string>();
        public List<Option> Options { get; set; } = new List<Option>();
        public bool GameEnd { get; set; } = false;
        public string? NextChapter { get; set; }
        
        // New format support (multiple nodes)
        public string? StartNode { get; set; }
        public Dictionary<string, ChapterNode> Nodes { get; set; } = new Dictionary<string, ChapterNode>();

        // Helper methods
        public bool IsNewFormat => Nodes.Any();
        public bool IsLegacyFormat => !IsNewFormat;

        public ChapterNode? GetCurrentNode(string? nodeId = null)
        {
            if (IsLegacyFormat)
            {
                // Convert legacy format to node format on-the-fly
                return new ChapterNode
                {
                    Text = this.Text,
                    Options = this.Options,
                    NextChapter = this.NextChapter,
                    GameEnd = this.GameEnd
                };
            }

            if (string.IsNullOrEmpty(nodeId))
                nodeId = StartNode;

            return !string.IsNullOrEmpty(nodeId) && Nodes.ContainsKey(nodeId) ? Nodes[nodeId] : null;
        }

        public static Chapter? LoadChapter(string id)
        {
            try
            {
                string resourcePath = $"Chapters/Prologo/{id}.json";

                // Try to load from embedded resources first (for build)
                string? json = RetroGame2091.Utils.ResourceLoader.LoadEmbeddedJson(resourcePath);

                // Fallback to file system (for debug mode)
                if (json == null)
                {
                    string chapterPath = Path.Combine("Chapters", "Prologo", $"{id}.json");
                    if (File.Exists(chapterPath))
                    {
                        json = File.ReadAllText(chapterPath);
                    }
                }

                if (json != null)
                {
                    return JsonConvert.DeserializeObject<Chapter>(json);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading chapter {id}: {ex.Message}");
            }

            return null;
        }

        public void SaveChapter()
        {
            try
            {
                string chapterPath = Path.Combine("Chapters", "Prologo", $"{Id}.json");
                Directory.CreateDirectory(Path.GetDirectoryName(chapterPath)!);
                string json = JsonConvert.SerializeObject(this, Formatting.Indented);
                File.WriteAllText(chapterPath, json);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error saving chapter {Id}: {ex.Message}");
            }
        }
    }
}