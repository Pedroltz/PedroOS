using Newtonsoft.Json;
using RetroGame2091.Core.Interfaces;
using RetroGame2091.Core.Models;

namespace RetroGame2091.Services
{
    public class NPCService : INPCService
    {
        private const string NPCsFolder = "NPCs";

        public NPCDefinition? LoadNPC(string npcId)
        {
            try
            {
                string resourcePath = $"NPCs/{npcId}.json";

                // Try embedded resources first (for protected NPCs in future)
                string? json = RetroGame2091.Utils.ResourceLoader.LoadEmbeddedJson(resourcePath);

                // Fallback to file system
                if (json == null)
                {
                    string npcPath = Path.Combine(NPCsFolder, $"{npcId}.json");
                    if (File.Exists(npcPath))
                    {
                        json = File.ReadAllText(npcPath);
                    }
                }

                if (json != null)
                {
                    return JsonConvert.DeserializeObject<NPCDefinition>(json);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading NPC {npcId}: {ex.Message}");
            }

            return null;
        }

        public bool NPCExists(string npcId)
        {
            string npcPath = Path.Combine(NPCsFolder, $"{npcId}.json");
            return File.Exists(npcPath);
        }

        public void CreateSampleNPCs()
        {
            Directory.CreateDirectory(NPCsFolder);

            var bartender = new NPCDefinition
            {
                Id = "bartender_tom",
                Name = "Tom 'Wirehead'",
                Role = "Bartender do Neon Dragon",
                Personality = "Cínico, desconfiado mas leal aos clientes regulares. Viu de tudo em Night City e nada mais o surpreende. Ocasionalmente filosófico quando está bêbado.",
                Appearance = "Homem de meia-idade com implantes neurais baratos visíveis nas têmporas, rosto desgastado pelo tempo, braço cibernético esquerdo com acabamento fosco. Cabelos grisalhos e olhos cansados que já viram demais.",
                Background = "Ex-netrunner corporativo da Arasaka que se queimou fazendo um trabalho ilegal. Perdeu memórias importantes no processo e agora administra este bar decadente em Japantown. Conhece muitos segredos corporativos mas nunca fala deles abertamente.",
                KnownTopics = new List<string>
                {
                    "História de Night City",
                    "Política corporativa (especialmente Arasaka e Biotechnica)",
                    "Netrunning básico e intermediário",
                    "Fofocas locais de Japantown",
                    "Garras de Tigre e outras gangues",
                    "Receitas de drinks ciberpunk",
                    "Funcionamento de implantes baratos"
                },
                UnknownTopics = new List<string>
                {
                    "Operações militares atuais",
                    "Cultura nômade (nunca saiu da cidade)",
                    "Estações orbitais",
                    "Tecnologia de ponta recente"
                },
                SpeechPattern = "Usa gírias de netrunner ocasionalmente. Fala de forma direta e sem rodeios. Ocasionalmente filosófico sobre a natureza de Night City. Usa termos como 'choom', 'gonk', 'preem'.",
                ImpatienceThreshold = 15,
                ImpatienceCues = new List<string>
                {
                    "Escuta, tenho outros clientes esperando...",
                    "Essa conversa tá ficando longa demais, choom.",
                    "Preciso voltar ao trabalho logo.",
                    "Tá ficando tarde e tenho que fechar o bar em breve."
                },
                Location = "Atrás do balcão do The Neon Dragon Bar, Japantown",
                RelatedFactions = new List<string>
                {
                    "Garras de Tigre (paga proteção)",
                    "Ex-Arasaka (passado)",
                    "Conhece gente da Biotechnica"
                }
            };

            SaveNPC(bartender);

            var streetVendor = new NPCDefinition
            {
                Id = "street_vendor_yuki",
                Name = "Yuki",
                Role = "Vendedora de rua",
                Personality = "Alegre e enérgica na superfície, mas esconde medos sobre sua sobrevivência. Muito simpática com clientes mas desconfiada de estranhos. Otimista demais para alguém que vive nas ruas.",
                Appearance = "Jovem asiática de uns 20 anos, cabelos pretos curtos com mechas rosa neon. Usa roupas coloridas misturadas com equipamento técnico. Implantes oculares básicos que mudam de cor conforme seu humor.",
                Background = "Órfã que cresceu nas ruas de Japantown. Vende estimulantes legais e ilegais, comida sintética e pequenos gadgets hackeados. Sonha em juntar dinheiro suficiente para abrir uma loja de verdade.",
                KnownTopics = new List<string>
                {
                    "Ruas de Japantown",
                    "Onde conseguir coisas baratas",
                    "Fofocas de rua",
                    "Drogas estimulantes (efeitos e preços)",
                    "Como sobreviver sem dinheiro",
                    "Cultura de rua",
                    "Gangues locais (conhecimento prático)"
                },
                UnknownTopics = new List<string>
                {
                    "Política corporativa de alto nível",
                    "Tecnologia avançada",
                    "Outras regiões de Night City além de Japantown",
                    "História antiga da cidade"
                },
                SpeechPattern = "Fala rápido e com muito entusiasmo. Usa muito gírias de rua. Ocasionalmente mistura japonês com português. Sempre tentando vender alguma coisa.",
                ImpatienceThreshold = 18,
                ImpatienceCues = new List<string>
                {
                    "Ei, eu preciso vender para outros clientes também!",
                    "Fica difícil conversar tanto e não vender nada, sabe?",
                    "Olha, foi legal trocar ideia mas preciso trabalhar!",
                    "Meu chefe vai reclamar se eu ficar só conversando..."
                },
                Location = "Barraca de rua na esquina da Rua Shibuya, Japantown",
                RelatedFactions = new List<string>
                {
                    "Garras de Tigre (paga proteção)",
                    "Vendedores de rua (comunidade)"
                }
            };

            SaveNPC(streetVendor);
        }

        private void SaveNPC(NPCDefinition npc)
        {
            try
            {
                string npcPath = Path.Combine(NPCsFolder, $"{npc.Id}.json");
                Directory.CreateDirectory(Path.GetDirectoryName(npcPath)!);
                string json = JsonConvert.SerializeObject(npc, Formatting.Indented);
                File.WriteAllText(npcPath, json);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error saving NPC {npc.Id}: {ex.Message}");
            }
        }
    }
}
