/** Simulated resource pressure; this does not inspect the browser's real memory. */
export class WindowPressure {
  private nextFailureAt = 0;

  public constructor(
    private readonly random: () => number = () => Math.random(),
    private readonly now: () => number = () => Date.now(),
  ) {}

  public shouldFail(openWindows: number): boolean {
    if (openWindows < 4 || this.now() < this.nextFailureAt) return false;
    const chance = Math.min(.6, .08 * (openWindows - 3));
    return this.random() < chance;
  }

  public recover(): void {
    this.nextFailureAt = this.now() + 60_000;
  }
}
