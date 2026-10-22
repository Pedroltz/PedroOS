import type { AppMountContext, ClientAppModule } from '../types/index.js';
import { IconRegistryClient } from '../core/IconRegistryClient.js';
import { MinesweeperEngine, type Difficulty } from './MinesweeperEngine.js';

export class MinesweeperApp implements ClientAppModule {
  public constructor(private readonly icons: IconRegistryClient) {}

  public mount(ctx: AppMountContext): () => void {
    const engine = new MinesweeperEngine('beginner');
    let flagMode = false; // Touch-friendly flag toggle mode
    let xyzzyBuffer = '';
    let cheatActive = false;

    ctx.container.innerHTML = `
      <div class="app-shell minesweeper-app" data-winmine>
        <div class="win95-menubar" role="menubar">
          <span class="win95-menu-item"><u>G</u>ame</span>
          <span class="win95-menu-item"><u>H</u>elp</span>
        </div>

        <div class="minesweeper-options">
          <label for="mine-diff-${ctx.windowId}">Skill:</label>
          <select id="mine-diff-${ctx.windowId}" data-mine-diff>
            <option value="beginner">Beginner (9x9, 10 mines)</option>
            <option value="intermediate">Intermediate (16x16, 40 mines)</option>
            <option value="expert">Expert (30x16, 99 mines)</option>
          </select>
          <button type="button" class="mine-flag-toggle" data-mine-flag-toggle aria-pressed="false" title="Alternar modo de marcação de bandeira (ótimo para touch)">
            🚩 Marcação
          </button>
        </div>

        <div class="mine-field-wrapper sunken-panel">
          <div class="mine-header inset-panel">
            <div class="mine-digit-display" data-mine-counter aria-label="Minas restantes">010</div>
            <button type="button" class="mine-face-btn" data-mine-face aria-label="Reiniciar partida">
              <img class="pixel-icon" data-mine-face-img src="${this.icons.getPath('face-smile', 16)}" width="16" height="16" alt="Smile" />
            </button>
            <div class="mine-digit-display" data-mine-timer aria-label="Tempo">000</div>
          </div>

          <div class="mine-grid-container" data-mine-grid-container>
            <div class="mine-grid" data-mine-grid role="grid" aria-label="Tabuleiro de Campo Minado"></div>
          </div>
        </div>

        <div class="cheat-radar-dot" data-cheat-dot title="Radar espião xyzzy" style="display:none;"></div>
      </div>
    `;

    const diffSelect = ctx.container.querySelector<HTMLSelectElement>('[data-mine-diff]')!;
    const flagToggleBtn = ctx.container.querySelector<HTMLButtonElement>('[data-mine-flag-toggle]')!;
    const counterEl = ctx.container.querySelector<HTMLElement>('[data-mine-counter]')!;
    const timerEl = ctx.container.querySelector<HTMLElement>('[data-mine-timer]')!;
    const faceBtn = ctx.container.querySelector<HTMLButtonElement>('[data-mine-face]')!;
    const faceImg = ctx.container.querySelector<HTMLImageElement>('[data-mine-face-img]')!;
    const gridEl = ctx.container.querySelector<HTMLElement>('[data-mine-grid]')!;
    const cheatDot = ctx.container.querySelector<HTMLElement>('[data-cheat-dot]')!;

    const format3Digits = (n: number): string => {
      if (n < 0) return '-' + Math.abs(n).toString().padStart(2, '0');
      return Math.min(999, Math.max(0, n)).toString().padStart(3, '0');
    };

    const updateFace = (faceKey: string): void => {
      faceImg.src = this.icons.getPath(faceKey, 16);
    };

    const renderHeader = (): void => {
      counterEl.textContent = format3Digits(engine.flagsRemaining);
      timerEl.textContent = format3Digits(engine.elapsedSeconds);

      if (engine.status === 'won') {
        updateFace('face-cool');
      } else if (engine.status === 'lost') {
        updateFace('face-dead');
      } else {
        updateFace('face-smile');
      }
    };

    const renderGrid = (): void => {
      gridEl.style.gridTemplateColumns = `repeat(${engine.cols}, 16px)`;
      gridEl.style.gridTemplateRows = `repeat(${engine.rows}, 16px)`;

      let html = '';
      for (let r = 0; r < engine.rows; r++) {
        for (let c = 0; c < engine.cols; c++) {
          const cell = engine.grid[r][c];
          let classes = 'mine-cell';
          let content = '';

          if (cell.state === 'revealed') {
            classes += ' revealed';
            if (cell.isMine) {
              classes += cell.exploded ? ' exploded' : ' mine';
              content = `<img class="pixel-icon" src="${this.icons.getPath('mine', 16)}" width="16" height="16" alt="*" />`;
            } else if (cell.adjacentMines > 0) {
              classes += ` adj-${cell.adjacentMines}`;
              content = `${cell.adjacentMines}`;
            }
          } else if (cell.state === 'flagged') {
            classes += cell.misflagged ? ' misflagged' : ' flagged';
            content = `<img class="pixel-icon" src="${this.icons.getPath('flag', 16)}" width="16" height="16" alt="F" />`;
          }

          html += `<button type="button" class="${classes}" data-row="${r}" data-col="${c}" aria-label="R${r}C${c}">${content}</button>`;
        }
      }
      gridEl.innerHTML = html;

      // Adjust window size for expert/intermediate
      if (engine.difficulty === 'beginner') {
        ctx.windowManager.resize(ctx.windowId, 280, 360);
      } else if (engine.difficulty === 'intermediate') {
        ctx.windowManager.resize(ctx.windowId, 390, 470);
      } else if (engine.difficulty === 'expert') {
        ctx.windowManager.resize(ctx.windowId, 620, 470);
      }
    };

    engine.onStateChange = () => {
      renderHeader();
      renderGrid();
    };

    engine.onTick = (sec) => {
      timerEl.textContent = format3Digits(sec);
    };

    diffSelect.addEventListener('change', () => {
      engine.reset(diffSelect.value as Difficulty);
    });

    flagToggleBtn.addEventListener('click', () => {
      flagMode = !flagMode;
      flagToggleBtn.classList.toggle('active', flagMode);
      flagToggleBtn.setAttribute('aria-pressed', String(flagMode));
    });

    faceBtn.addEventListener('click', () => {
      engine.reset();
    });

    gridEl.addEventListener('mousedown', (ev) => {
      if (engine.status === 'idle' || engine.status === 'playing') {
        const btn = (ev.target as HTMLElement).closest('.mine-cell');
        if (btn && ev.button === 0) {
          updateFace('face-wow');
        }
      }
    });

    window.addEventListener('mouseup', () => {
      if (engine.status === 'idle' || engine.status === 'playing') {
        updateFace('face-smile');
      }
    });

    // Handle clicks
    gridEl.addEventListener('click', (ev) => {
      const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('.mine-cell');
      if (!btn) return;
      const r = parseInt(btn.dataset.row!, 10);
      const c = parseInt(btn.dataset.col!, 10);

      if (flagMode) {
        engine.toggleFlag(r, c);
      } else {
        const cell = engine.grid[r][c];
        if (cell.state === 'revealed') {
          engine.chord(r, c);
        } else {
          engine.reveal(r, c);
        }
      }
    });

    gridEl.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('.mine-cell');
      if (!btn) return;
      const r = parseInt(btn.dataset.row!, 10);
      const c = parseInt(btn.dataset.col!, 10);
      engine.toggleFlag(r, c);
    });

    // Cheat code xyzzy
    const onKey = (ev: KeyboardEvent): void => {
      xyzzyBuffer += ev.key.toLowerCase();
      if (xyzzyBuffer.endsWith('xyzzy')) {
        cheatActive = !cheatActive;
        cheatDot.style.display = cheatActive ? 'block' : 'none';
        xyzzyBuffer = '';
      }
      if (xyzzyBuffer.length > 20) {
        xyzzyBuffer = xyzzyBuffer.slice(-10);
      }
    };
    window.addEventListener('keydown', onKey);

    gridEl.addEventListener('mousemove', (ev) => {
      if (!cheatActive) return;
      const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('.mine-cell');
      if (btn) {
        const r = parseInt(btn.dataset.row!, 10);
        const c = parseInt(btn.dataset.col!, 10);
        const isMine = engine.isMine(r, c);
        cheatDot.style.background = isMine ? 'black' : 'white';
      }
    });

    renderHeader();
    renderGrid();

    return () => {
      engine.reset();
      window.removeEventListener('keydown', onKey);
      ctx.container.innerHTML = '';
    };
  }
}
