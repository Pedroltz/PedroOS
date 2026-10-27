namespace RetroGame2091.Core.Models
{
    /// <summary>
    /// Tipos de itens disponíveis no jogo
    /// </summary>
    public enum ItemType
    {
        Consumable,  // Itens consumíveis (medkit, drogas, etc)
        KeyItem,     // Itens de história/chave (não consumíveis)
        Upgrade      // Melhorias permanentes
    }

    /// <summary>
    /// Tipos de efeitos que itens podem ter
    /// </summary>
    public enum EffectType
    {
        RestoreHealth,          // Restaura pontos de saúde
        RestorePsychology,      // Restaura pontos de psicologia
        TemporaryStrength,      // Aumenta força temporariamente
        TemporaryIntelligence,  // Aumenta inteligência temporariamente
        TemporaryConversation,  // Aumenta conversação temporariamente
        Permanent               // Efeito permanente ou nenhum efeito
    }

    /// <summary>
    /// Efeito de um item quando usado
    /// </summary>
    public class ItemEffect
    {
        public EffectType Type { get; set; } = EffectType.Permanent;
        public int Value { get; set; } = 0;
        public int Duration { get; set; } = 0;  // Duração em turnos (0 = instantâneo/permanente)
    }

    /// <summary>
    /// Definição de um item (template carregado de JSON)
    /// </summary>
    public class Item
    {
        public string Id { get; set; } = "";
        public string Name { get; set; } = "";
        public string Description { get; set; } = "";
        public ItemType Type { get; set; } = ItemType.Consumable;
        public ItemEffect Effect { get; set; } = new ItemEffect();
        public int MaxStack { get; set; } = 15;  // Máximo de unidades empilháveis
        public bool IsStackable { get; set; } = true;
        public string? IconSymbol { get; set; } = "▸";  // Símbolo Unicode para UI
    }

    /// <summary>
    /// Instância de item no inventário do jogador (com quantidade)
    /// </summary>
    public class InventoryItem
    {
        public string ItemId { get; set; } = "";
        public int Quantity { get; set; } = 1;

        /// <summary>
        /// Verifica se pode adicionar mais unidades respeitando o limite de stack
        /// </summary>
        public bool CanAddMore(int amount, int maxStack)
        {
            return Quantity + amount <= maxStack;
        }

        /// <summary>
        /// Adiciona unidades ao stack
        /// </summary>
        public void Add(int amount)
        {
            Quantity += amount;
        }

        /// <summary>
        /// Remove unidades do stack
        /// </summary>
        public void Remove(int amount)
        {
            Quantity = Math.Max(0, Quantity - amount);
        }
    }
}
