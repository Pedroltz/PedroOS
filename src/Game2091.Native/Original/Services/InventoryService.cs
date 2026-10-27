using Newtonsoft.Json;
using RetroGame2091.Core.Interfaces;
using RetroGame2091.Core.Models;

namespace RetroGame2091.Services
{
    public class InventoryService : IInventoryService
    {
        private readonly IPlayerSaveService _playerSaveService;
        private const int MAX_INVENTORY_SLOTS = 5;

        public InventoryService(IPlayerSaveService playerSaveService)
        {
            _playerSaveService = playerSaveService;
        }

        private List<InventoryItem> GetInventory()
        {
            return _playerSaveService.PlayerSave.Character.Inventory;
        }

        public bool AddItem(string itemId, int quantity = 1)
        {
            if (quantity <= 0) return false;

            var itemDef = LoadItemDefinition(itemId);
            if (itemDef == null) return false;

            var inventory = GetInventory();
            var existingItem = inventory.FirstOrDefault(i => i.ItemId == itemId);

            if (existingItem != null)
            {
                // Item já existe, tentar adicionar ao stack
                if (!itemDef.IsStackable) return false; // Item não empilhável

                if (existingItem.CanAddMore(quantity, itemDef.MaxStack))
                {
                    existingItem.Add(quantity);
                    return true;
                }
                else
                {
                    // Stack cheio
                    return false;
                }
            }
            else
            {
                // Item novo - verificar slots disponíveis
                if (inventory.Count >= MAX_INVENTORY_SLOTS)
                {
                    return false; // Inventário cheio
                }

                // Adicionar novo item
                inventory.Add(new InventoryItem
                {
                    ItemId = itemId,
                    Quantity = Math.Min(quantity, itemDef.MaxStack)
                });
                return true;
            }
        }

        public bool RemoveItem(string itemId, int quantity = 1)
        {
            if (quantity <= 0) return false;

            var inventory = GetInventory();
            var item = inventory.FirstOrDefault(i => i.ItemId == itemId);

            if (item == null || item.Quantity < quantity)
            {
                return false;
            }

            item.Remove(quantity);

            // Se quantidade chegou a 0, remover do inventário
            if (item.Quantity <= 0)
            {
                inventory.Remove(item);
            }

            return true;
        }

        public bool UseItem(string itemId)
        {
            var itemDef = LoadItemDefinition(itemId);
            if (itemDef == null) return false;

            if (!HasItem(itemId)) return false;

            var character = _playerSaveService.PlayerSave.Character;

            // Aplicar efeitos baseado no tipo
            switch (itemDef.Effect.Type)
            {
                case EffectType.RestoreHealth:
                    character.Attributes.Saude = Math.Min(character.Attributes.MaxSaude, character.Attributes.Saude + itemDef.Effect.Value);
                    break;

                case EffectType.RestorePsychology:
                    character.Attributes.Psicologia = Math.Min(character.Attributes.MaxPsicologia, character.Attributes.Psicologia + itemDef.Effect.Value);
                    break;

                case EffectType.TemporaryStrength:
                case EffectType.TemporaryIntelligence:
                case EffectType.TemporaryConversation:
                    // TODO: Implementar sistema de buffs temporários no futuro
                    // Por enquanto, aplicar como buff permanente temporariamente
                    break;

                case EffectType.Permanent:
                    // Item não tem efeito de uso (key items)
                    return false;

                default:
                    return false;
            }

            // Remover 1 unidade do item após usar (exceto se for KeyItem)
            if (itemDef.Type == ItemType.Consumable)
            {
                RemoveItem(itemId, 1);
            }

            return true;
        }

        public bool HasItem(string itemId, int minQuantity = 1)
        {
            var inventory = GetInventory();
            var item = inventory.FirstOrDefault(i => i.ItemId == itemId);
            return item != null && item.Quantity >= minQuantity;
        }

        public int GetItemCount(string itemId)
        {
            var inventory = GetInventory();
            var item = inventory.FirstOrDefault(i => i.ItemId == itemId);
            return item?.Quantity ?? 0;
        }

        public List<InventoryItem> GetAllItems()
        {
            return GetInventory();
        }

        public bool CanAddItem(string itemId, int quantity = 1)
        {
            if (quantity <= 0) return false;

            var itemDef = LoadItemDefinition(itemId);
            if (itemDef == null) return false;

            var inventory = GetInventory();
            var existingItem = inventory.FirstOrDefault(i => i.ItemId == itemId);

            if (existingItem != null)
            {
                // Item já existe, verificar se pode adicionar ao stack
                if (!itemDef.IsStackable) return false;
                return existingItem.CanAddMore(quantity, itemDef.MaxStack);
            }
            else
            {
                // Item novo, verificar se há slots disponíveis
                return inventory.Count < MAX_INVENTORY_SLOTS;
            }
        }

        public Item? LoadItemDefinition(string itemId)
        {
            try
            {
                string resourcePath = $"Items/{itemId}.json";

                // Try to load from embedded resources first (for build)
                string? json = RetroGame2091.Utils.ResourceLoader.LoadEmbeddedJson(resourcePath);

                // Fallback to file system (for debug mode)
                if (json == null)
                {
                    string itemPath = Path.Combine("Items", $"{itemId}.json");
                    if (File.Exists(itemPath))
                    {
                        json = File.ReadAllText(itemPath);
                    }
                }

                if (json != null)
                {
                    return JsonConvert.DeserializeObject<Item>(json);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erro ao carregar item {itemId}: {ex.Message}");
            }

            return null;
        }

        public int GetAvailableSlots()
        {
            var inventory = GetInventory();
            return MAX_INVENTORY_SLOTS - inventory.Count;
        }
    }
}
