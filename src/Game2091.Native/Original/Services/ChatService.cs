using RetroGame2091.Core.Interfaces;
using RetroGame2091.Core.Models;
using System.Text;

namespace RetroGame2091.Services
{
    public class ChatService : IChatService
    {
        private readonly INPCService _npcService;
        private readonly IDeepSeekService _deepSeekService;
        private readonly IPlayerSaveService _playerSaveService;

        public ChatService(
            INPCService npcService,
            IDeepSeekService deepSeekService,
            IPlayerSaveService playerSaveService)
        {
            _npcService = npcService;
            _deepSeekService = deepSeekService;
            _playerSaveService = playerSaveService;
        }

        public async Task<string?> StartChatSession(string npcId)
        {
            var npc = _npcService.LoadNPC(npcId);
            if (npc == null)
                return null;

            var session = GetChatSession(npcId) ?? new ChatSession
            {
                NPCId = npcId,
                Messages = new List<ChatMessage>(),
                MessageCount = 0,
                IsActive = true
            };

            var player = _playerSaveService.PlayerSave.Character;
            string systemPrompt = BuildSystemPrompt(npc, player, session.MessageCount);

            var initialMessage = await _deepSeekService.SendMessageAsync(session.Messages, systemPrompt);

            if (initialMessage != null)
            {
                session.Messages.Add(new ChatMessage
                {
                    Role = "assistant",
                    Content = initialMessage
                });
                session.MessageCount++;
                SaveChatHistory(npcId, session);
            }

            return initialMessage;
        }

        public ChatSession? GetChatSession(string npcId)
        {
            var conversations = _playerSaveService.PlayerSave.Character.NPCConversations;
            return conversations.GetValueOrDefault(npcId);
        }

        public void SaveChatHistory(string npcId, ChatSession session)
        {
            var conversations = _playerSaveService.PlayerSave.Character.NPCConversations;
            conversations[npcId] = session;
            session.LastInteraction = DateTime.Now;
        }

        public string BuildSystemPrompt(NPCDefinition npc, Protagonist player, int messageCount)
        {
            var prompt = new StringBuilder();

            // Core identity
            prompt.AppendLine($"Você é {npc.Name}, {npc.Role} em Night City (ano 2091).");
            prompt.AppendLine($"Aparência: {npc.Appearance}");
            prompt.AppendLine($"Background: {npc.Background}");
            prompt.AppendLine();

            // Personality
            prompt.AppendLine($"Personalidade: {npc.Personality}");
            prompt.AppendLine($"Padrão de fala: {npc.SpeechPattern}");
            prompt.AppendLine();

            // Context
            prompt.AppendLine($"Localização atual: {npc.Location}");
            prompt.AppendLine($"Você está conversando com {player.Name}, {GetPlayerDescription(player)}.");
            prompt.AppendLine();

            // Knowledge boundaries
            prompt.AppendLine("Tópicos que você conhece:");
            foreach (var topic in npc.KnownTopics)
            {
                prompt.AppendLine($"- {topic}");
            }

            if (npc.UnknownTopics.Count > 0)
            {
                prompt.AppendLine();
                prompt.AppendLine("Tópicos que você NÃO conhece (responda honestamente se perguntado):");
                foreach (var topic in npc.UnknownTopics)
                {
                    prompt.AppendLine($"- {topic}");
                }
            }

            prompt.AppendLine();
            prompt.AppendLine("REGRAS IMPORTANTES:");
            prompt.AppendLine("- Mantenha-se no personagem o tempo TODO");
            prompt.AppendLine("- Mantenha respostas com menos de 100 palavras");
            prompt.AppendLine("- Responda em Português Brasileiro");
            prompt.AppendLine("- Não quebre a quarta parede");
            prompt.AppendLine("- Isto é roleplay para imersão - você NÃO PODE afetar o gameplay");
            prompt.AppendLine("- Não dê itens, dinheiro ou vantagens de gameplay");

            // Impatience system
            if (messageCount >= npc.ImpatienceThreshold - 3)
            {
                prompt.AppendLine();
                prompt.AppendLine($"NOTA: Vocês já estão conversando há um tempo ({messageCount} mensagens). Comece a mostrar sinais de impaciência.");
                if (npc.ImpatienceCues.Count > 0)
                {
                    prompt.AppendLine("Ocasionalmente use frases como:");
                    foreach (var cue in npc.ImpatienceCues.Take(2))
                    {
                        prompt.AppendLine($"- '{cue}'");
                    }
                }
            }

            if (messageCount >= npc.ImpatienceThreshold)
            {
                prompt.AppendLine();
                prompt.AppendLine("IMPORTANTE: Você está ficando impaciente agora. Educadamente mas firmemente encerre a conversa em breve.");
            }

            return prompt.ToString();
        }

        private string GetPlayerDescription(Protagonist player)
        {
            var parts = new List<string>();

            parts.Add("funcionário da Biotechnica");

            // Add attribute descriptions
            if (player.Attributes.Inteligencia >= 60)
                parts.Add($"com inteligência {GetAttributeLevel(player.Attributes.Inteligencia)}");

            if (player.Attributes.Conversacao >= 60)
                parts.Add($"e habilidades sociais {GetAttributeLevel(player.Attributes.Conversacao)}");
            else if (player.Attributes.Conversacao <= 30)
                parts.Add($"mas com habilidades sociais {GetAttributeLevel(player.Attributes.Conversacao)}");

            return string.Join(", ", parts);
        }

        private string GetAttributeLevel(int value)
        {
            return value switch
            {
                >= 80 => "excepcionais",
                >= 60 => "altas",
                >= 40 => "moderadas",
                >= 20 => "baixas",
                _ => "muito baixas"
            };
        }
    }
}
