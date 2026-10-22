export type Difficulty = 'beginner' | 'intermediate' | 'expert';

export interface DifficultyConfig {
  rows: number;
  cols: number;
  mines: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
};

export type CellState = 'hidden' | 'revealed' | 'flagged' | 'question';

export interface Cell {
  row: number;
  col: number;
  isMine: boolean;
  adjacentMines: number;
  state: CellState;
  exploded?: boolean;
  misflagged?: boolean;
}

export type GameStatus = 'idle' | 'playing' | 'won' | 'lost';

export class MinesweeperEngine {
  public rows: number;
  public cols: number;
  public totalMines: number;
  public grid: Cell[][] = [];
  public status: GameStatus = 'idle';
  public flagsRemaining: number;
  public elapsedSeconds = 0;
  private firstClick = true;
  private timerId: ReturnType<typeof setInterval> | null = null;
  public onStateChange?: () => void;
  public onTick?: (seconds: number) => void;

  public constructor(public difficulty: Difficulty = 'beginner') {
    const cfg = DIFFICULTIES[difficulty];
    this.rows = cfg.rows;
    this.cols = cfg.cols;
    this.totalMines = cfg.mines;
    this.flagsRemaining = cfg.mines;
    this.reset(difficulty);
  }

  public reset(difficulty: Difficulty = this.difficulty): void {
    this.stopTimer();
    this.difficulty = difficulty;
    const cfg = DIFFICULTIES[difficulty];
    this.rows = cfg.rows;
    this.cols = cfg.cols;
    this.totalMines = cfg.mines;
    this.flagsRemaining = cfg.mines;
    this.status = 'idle';
    this.firstClick = true;
    this.elapsedSeconds = 0;

    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < this.cols; c++) {
        row.push({
          row: r,
          col: c,
          isMine: false,
          adjacentMines: 0,
          state: 'hidden',
        });
      }
      this.grid.push(row);
    }

    this.onStateChange?.();
    this.onTick?.(0);
  }

  private startTimer(): void {
    if (this.timerId) return;
    this.timerId = setInterval(() => {
      if (this.status === 'playing') {
        this.elapsedSeconds = Math.min(999, this.elapsedSeconds + 1);
        this.onTick?.(this.elapsedSeconds);
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private placeMines(excludeR: number, excludeC: number): void {
    let placed = 0;
    while (placed < this.totalMines) {
      const r = Math.floor(Math.random() * this.rows);
      const c = Math.floor(Math.random() * this.cols);
      // Safe first click zone: avoid target cell and its immediate neighbors if possible
      const isNearTarget = Math.abs(r - excludeR) <= 1 && Math.abs(c - excludeC) <= 1;
      const isTarget = r === excludeR && c === excludeC;

      // When board is small or high density, at minimum avoid exact cell
      const shouldAvoid = this.rows * this.cols - this.totalMines > 9 ? isNearTarget : isTarget;

      if (!this.grid[r][c].isMine && !shouldAvoid) {
        this.grid[r][c].isMine = true;
        placed++;
      }
    }

    // Fallback if needed
    while (placed < this.totalMines) {
      const r = Math.floor(Math.random() * this.rows);
      const c = Math.floor(Math.random() * this.cols);
      if (!this.grid[r][c].isMine && !(r === excludeR && c === excludeC)) {
        this.grid[r][c].isMine = true;
        placed++;
      }
    }

    // Calculate adjacencies
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.grid[r][c].isMine) {
          let count = 0;
          this.forEachNeighbor(r, c, (n) => {
            if (n.isMine) count++;
          });
          this.grid[r][c].adjacentMines = count;
        }
      }
    }
  }

  public forEachNeighbor(r: number, c: number, fn: (neighbor: Cell) => void): void {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
          fn(this.grid[nr][nc]);
        }
      }
    }
  }

  public reveal(r: number, c: number): boolean {
    if (this.status === 'won' || this.status === 'lost') return false;
    const cell = this.grid[r]?.[c];
    if (!cell || cell.state === 'revealed' || cell.state === 'flagged') return false;

    if (this.firstClick) {
      this.firstClick = false;
      this.placeMines(r, c);
      this.status = 'playing';
      this.startTimer();
    }

    if (cell.isMine) {
      cell.exploded = true;
      this.gameOver(false);
      return false;
    }

    this.floodReveal(cell);
    this.checkWinCondition();
    this.onStateChange?.();
    return true;
  }

  private floodReveal(cell: Cell): void {
    if (cell.state === 'revealed' || cell.state === 'flagged') return;
    cell.state = 'revealed';

    if (cell.adjacentMines === 0 && !cell.isMine) {
      this.forEachNeighbor(cell.row, cell.col, (neighbor) => {
        if (neighbor.state === 'hidden') {
          this.floodReveal(neighbor);
        }
      });
    }
  }

  public toggleFlag(r: number, c: number): void {
    if (this.status === 'won' || this.status === 'lost') return;
    const cell = this.grid[r]?.[c];
    if (!cell || cell.state === 'revealed') return;

    if (cell.state === 'hidden') {
      cell.state = 'flagged';
      this.flagsRemaining--;
    } else if (cell.state === 'flagged') {
      cell.state = 'hidden';
      this.flagsRemaining++;
    }
    this.onStateChange?.();
  }

  public chord(r: number, c: number): void {
    if (this.status !== 'playing') return;
    const cell = this.grid[r]?.[c];
    if (!cell || cell.state !== 'revealed' || cell.adjacentMines === 0) return;

    let flagCount = 0;
    this.forEachNeighbor(r, c, (n) => {
      if (n.state === 'flagged') flagCount++;
    });

    if (flagCount === cell.adjacentMines) {
      this.forEachNeighbor(r, c, (n) => {
        if (n.state === 'hidden') {
          this.reveal(n.row, n.col);
        }
      });
    }
  }

  private checkWinCondition(): void {
    if (this.status !== 'playing') return;
    let unrevealedSafe = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (!cell.isMine && cell.state !== 'revealed') {
          unrevealedSafe++;
        }
      }
    }
    if (unrevealedSafe === 0) {
      this.gameOver(true);
    }
  }

  private gameOver(won: boolean): void {
    this.stopTimer();
    this.status = won ? 'won' : 'lost';

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (won) {
          if (cell.isMine) cell.state = 'flagged';
        } else {
          if (cell.isMine && cell.state !== 'flagged') {
            cell.state = 'revealed';
          } else if (!cell.isMine && cell.state === 'flagged') {
            cell.misflagged = true;
          }
        }
      }
    }
    if (won) {
      this.flagsRemaining = 0;
    }
    this.onStateChange?.();
  }

  public isMine(r: number, c: number): boolean {
    return Boolean(this.grid[r]?.[c]?.isMine);
  }
}
