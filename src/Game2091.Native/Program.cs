using System.Text;
using RetroGame2091.Core.Interfaces;
using RetroGame2091.Services;
using RetroGame2091.UI.Components;
using RetroGame2091.UI.Menus;

// Hosted entrypoint. The original console UI, narrative, combat and saves run unchanged.
// Music commands travel through the PTY to the browser; no server audio process is needed.
Console.OutputEncoding = Encoding.UTF8;
Console.InputEncoding = Encoding.UTF8;
Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
var config = new GameConfigService();
var saves = new PlayerSaveService();
var inventory = new InventoryService(saves);
var ui = new UIService(config, saves, inventory);
var chapters = new ChapterService(saves);
var enemies = new EnemyService();
var combat = new CombatService();
var combatUi = new CombatUIService(ui, config);
var orchestration = new CombatOrchestrationService(combat, enemies, combatUi, ui, saves, config, inventory);
var npcs = new NPCService();
var deepSeek = new DeepSeekService();
var chat = new ChatService(npcs, deepSeek, saves);
var chatUi = new ChatUIService(ui, config, chat, npcs, deepSeek, saves);
var creation = new CharacterCreationMenu(ui, saves, config);
var settings = new SettingsMenu(ui, saves, config);
await new GameController(ui, saves, chapters, config, creation, settings, new BrowserMusic(), orchestration, inventory, chatUi).Run();

sealed class BrowserMusic : IMusicService
{
    private bool playing;
    public void StartTitleMusic() { playing = true; Console.Write("\x1b]2091;music:start\x07"); }
    public void StopMusic() { playing = false; Console.Write("\x1b]2091;music:stop\x07"); }
    public bool IsMusicPlaying() => playing;
}
