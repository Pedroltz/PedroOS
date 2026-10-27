# 2091 - Corporate Cyberpunk Adventure

**Version**: Pre-Alpha  
**Status**: In Development  
**Target Framework**: .NET 8.0  

A text-based cyberpunk adventure game set in the year 2091, featuring corporate intrigue, character progression, and narrative-driven gameplay with JSON-based story structure.

## Project Status

This project is currently in **pre-alpha** stage. Core systems are implemented and functional, but content and features are still being developed.

### Working Features
- Character creation system with attribute distribution
- JSON-based narrative system with variable substitution
- Save/load functionality
- Cross-platform audio system (optional FFmpeg integration)
- Corporate-themed UI with ASCII art
- Settings management
- Chapter navigation system"

### In Development
- Complete story content
- Combat system expansion
- Additional interactive elements
- Enhanced UI components

## System Requirements

### Runtime Dependencies
- .NET 8.0 Runtime or higher
- Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+/equivalent)

### Optional Dependencies
- FFmpeg/FFplay (for background music)

### Hardware Requirements
- 512 MB RAM
- 50 MB disk space
- Terminal with UTF-8 support

## Installation

### Prerequisites

#### Installing .NET 8.0 Runtime

**Windows:**
```powershell
# Via Chocolatey
choco install dotnet-8.0-runtime

# Via Winget
winget install Microsoft.DotNet.Runtime.8

# Manual download: https://dotnet.microsoft.com/download/dotnet/8.0
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install dotnet-runtime-8.0
```

**Linux (Fedora):**
```bash
sudo dnf install dotnet-runtime-8.0
```

**macOS:**
```bash
# Via Homebrew
brew install --cask dotnet

# Manual download: https://dotnet.microsoft.com/download/dotnet/8.0
```

#### Installing FFmpeg (Optional)

**Windows:**
```powershell
choco install ffmpeg
# or
scoop install ffmpeg
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# Fedora
sudo dnf install ffmpeg

# Arch Linux
sudo pacman -S ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

### Running the Game

1. Clone or download the project
2. Navigate to the project directory
3. Run the application:

```bash
dotnet run
```

The game will automatically attempt to install FFmpeg if not present (Windows/Linux only).

## Game Features

### Character Creation
- Corporate-themed character creation interface
- Five primary attributes: Physical Resistance, Mental Stability, Brute Force, Technical Aptitude, Communication
- 50-point distribution system with minimum thresholds
- Dynamic competency ratings (INADEQUATE to EXCEPTIONAL)

### Narrative System
- JSON-based story structure for easy content modification
- Variable substitution system supporting player data
- Branching storylines with choice-based progression
- Automatic save system

### Audio System
- Cross-platform background music support
- Automatic FFmpeg detection and installation
- Graceful degradation when audio is unavailable

## Technical Architecture

### Project Structure
```
2091/
├── Core/
│   ├── Interfaces/          # Service contracts
│   └── Models/              # Data models
├── Services/                # Business logic
├── UI/
│   ├── Components/          # UI services
│   └── Menus/              # Menu systems
├── Utils/                  # Utility classes
├── Config/                 # Configuration files
├── Saves/                  # Save game data
└── Program.cs              # Application entry point
```

### Key Components

**Core Services:**
- `IChapterService` - Story content management
- `IPlayerSaveService` - Save/load operations
- `IGameConfigService` - Configuration management
- `IMusicService` - Audio system management
- `IUIService` - User interface operations

**Models:**
- `PlayerSave` - Player progress and character data
- `Chapter` - Story content structure
- `GameConfig` - Application settings
- `Attributes` - Character attribute system

## Configuration

### Game Configuration (`Config/config.json`)
Controls visual settings, text speed, and display options.

### Save System (`Saves/player.json`)
Stores player character data, progress, and gameplay statistics.

## Development

### Building from Source
```bash
# Restore dependencies
dotnet restore

# Build project
dotnet build

# Run in development mode
dotnet run
```

### Dependencies
- **Newtonsoft.Json** (13.0.3) - JSON serialization
- **.NET 8.0** - Runtime platform

## Story Content Format

The game uses JSON files for story content with the following structure:

```json
{
  "Id": "chapter_identifier",
  "Title": "Chapter Title",
  "Text": [
    "Narrative text line 1",
    "Use {name} for player name",
    "Use {health}, {intelligence} for attributes"
  ],
  "Options": [
    {
      "Text": "Choice description",
      "NextChapter": "next_chapter_id"
    }
  ],
  "GameEnd": false
}
```

### Variable System
Available variables for story text:
- Player data: `{name}`, `{protagonist}`, `{player}`
- Attributes: `{health}`, `{psychology}`, `{strength}`, `{intelligence}`, `{conversation}`
- Metadata: `{playtime}`, `{created}`, `{lastplayed}`, `{date}`, `{time}`

## Troubleshooting

### Common Issues

**"dotnet: command not found"**
- Ensure .NET 8.0 Runtime is installed
- Restart terminal after installation
- Add .NET to system PATH if manually installed

**Audio not working**
- FFmpeg installation may be required
- Game functions normally without audio
- Check system audio permissions on Linux

**Character encoding issues**
- Ensure terminal supports UTF-8
- Use Windows Terminal or PowerShell 7+ on Windows
- Avoid PowerShell ISE