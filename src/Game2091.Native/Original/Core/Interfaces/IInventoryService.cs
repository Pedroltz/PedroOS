using RetroGame2091.Core.Models;

namespace RetroGame2091.Core.Interfaces
{
    public interface IInventoryService
    {
        /// <summary>
        /// Adiciona um item ao inventário
        /// </summary>
        /// <param name="itemId">ID do item</param>
        /// <param name="quantity">Quantidade a adicionar</param>
        /// <returns>True se conseguiu adicionar, false se inventário está cheio</returns>
        bool AddItem(string itemId, int quantity = 1);

        /// <summary>
        /// Remove um item do inventário
        /// </summary>
        /// <param name="itemId">ID do item</param>
        /// <param name="quantity">Quantidade a remover</param>
        /// <returns>True se conseguiu remover, false se não tinha o item</returns>
        bool RemoveItem(string itemId, int quantity = 1);

        /// <summary>
        /// Usa um item consumível (aplica efeitos e remove do inventário)
        /// </summary>
        /// <param name="itemId">ID do item</param>
        /// <returns>True se conseguiu usar, false se não tinha o item ou erro</returns>
        bool UseItem(string itemId);

        /// <summary>
        /// Verifica se o jogador possui um item
        /// </summary>
        /// <param name="itemId">ID do item</param>
        /// <param name="minQuantity">Quantidade mínima necessária</param>
        /// <returns>True se possui o item com quantidade suficiente</returns>
        bool HasItem(string itemId, int minQuantity = 1);

        /// <summary>
        /// Retorna a quantidade de um item específico no inventário
        /// </summary>
        /// <param name="itemId">ID do item</param>
        /// <returns>Quantidade do item (0 se não possui)</returns>
        int GetItemCount(string itemId);

        /// <summary>
        /// Retorna todos os itens do inventário
        /// </summary>
        /// <returns>Lista de InventoryItem</returns>
        List<InventoryItem> GetAllItems();

        /// <summary>
        /// Verifica se pode adicionar um item ao inventário
        /// </summary>
        /// <param name="itemId">ID do item</param>
        /// <param name="quantity">Quantidade a adicionar</param>
        /// <returns>True se há espaço disponível</returns>
        bool CanAddItem(string itemId, int quantity = 1);

        /// <summary>
        /// Carrega a definição de um item do arquivo JSON
        /// </summary>
        /// <param name="itemId">ID do item</param>
        /// <returns>Item ou null se não encontrado</returns>
        Item? LoadItemDefinition(string itemId);

        /// <summary>
        /// Retorna o número de slots disponíveis no inventário
        /// </summary>
        /// <returns>Número de slots livres (0-5)</returns>
        int GetAvailableSlots();
    }
}
