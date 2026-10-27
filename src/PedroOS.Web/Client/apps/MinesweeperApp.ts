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
    let lastDifficulty: Difficulty | null = null;

    ctx.container.innerHTML = `
      <div class="app-shell minesweeper-app" data-winmine>
        <div class="win95-menubar" role="menubar">
          <span class="win95-menu-item"><u>J</u>ogo</span>
          <span class="win95-menu-item">A<u>j</u>uda</span>
        </div>

        <div class="minesweeper-options">
          <label for="mine-diff-${ctx.windowId}">Dificuldade:</label>
          <select id="mine-diff-${ctx.windowId}" data-mine-diff>
            <option value="beginner">Iniciante (9×9, 10 minas)</option>
            <option value="intermediate">Intermediário (16×16, 40 minas)</option>
            <option value="expert">Avançado (30×16, 99 minas)</option>
          </select>
          <button type="button" class="mine-flag-toggle" data-mine-flag-toggle aria-pressed="false" title="Alternar modo de marcação de bandeira (ótimo para touch)">
            ${this.icons.render('flag', 16)}
            <span>Marcação</span>
          </button>
        </div>

        <div class="mine-field-wrapper sunken-panel">
          <div class="mine-header inset-panel">
            <div class="mine-digit-display" data-mine-counter aria-label="Minas restantes">010</div>
            <button type="button" class="mine-face-btn" data-mine-face aria-label="Reiniciar partida">
              <img class="pixel-icon" data-mine-face-img src="${this.icons.getPath('face-smile', 16)}" width="16" height="16" alt="Sorriso" />
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
    const app = ctx.container.querySelector<HTMLElement>('[data-winmine]')!;
    const viewport = ctx.container.querySelector<HTMLElement>('[data-mine-grid-container]')!;
    const fitBoard = (): void => {
      // Include the viewport padding and grid border; every cell must remain visible.
      if (!viewport.clientWidth || !viewport.clientHeight) return;
      const size = Math.min(16, (viewport.clientWidth - 8) / engine.cols, (viewport.clientHeight - 8) / engine.rows);
      app.style.setProperty('--mine-cell-size', `${Math.max(1, Math.floor(size * 100) / 100)}px`);
    };
    const boardObserver = new ResizeObserver(fitBoard);
    boardObserver.observe(viewport);

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
      gridEl.style.gridTemplateColumns = `repeat(${engine.cols}, var(--mine-cell-size, 16px))`;
      gridEl.style.gridTemplateRows = `repeat(${engine.rows}, var(--mine-cell-size, 16px))`;

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
              content = `${this.icons.render('mine', 16, 'pixel-icon', '*')}`;
            } else if (cell.adjacentMines > 0) {
              classes += ` adj-${cell.adjacentMines}`;
              content = `${cell.adjacentMines}`;
            }
          } else if (cell.state === 'flagged') {
            classes += cell.misflagged ? ' misflagged' : ' flagged';
            content = `${this.icons.render('flag', 16, 'pixel-icon', 'F')}`;
          }

          html += `<button type="button" class="${classes}" data-row="${r}" data-col="${c}" aria-label="R${r}C${c}">${content}</button>`;
        }
      }
      gridEl.innerHTML = html;

      // Only a difficulty change alters the preferred size. Playing preserves user sizing.
      if (lastDifficulty !== engine.difficulty) {
        lastDifficulty = engine.difficulty;
        app.style.setProperty('--mine-field-width', `${engine.cols * 16 + 20}px`);
        app.style.setProperty('--mine-field-height', `${engine.rows * 16 + 60}px`);
        const sizes = { beginner: [280, 330], intermediate: [320, 430], expert: [520, 430] } as const;
        const [width, height] = sizes[engine.difficulty];
        ctx.windowManager.resize(ctx.windowId, width, height);
      }
      fitBoard();
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

    const onMouseUp = (): void => {
      if (engine.status === 'idle' || engine.status === 'playing') {
        updateFace('face-smile');
      }
    };
    window.addEventListener('mouseup', onMouseUp);

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
      boardObserver.disconnect();
      engine.onStateChange = undefined;
      engine.onTick = undefined;
      engine.reset();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mouseup', onMouseUp);
      ctx.container.innerHTML = '';
    };
  }
}
