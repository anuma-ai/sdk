/**
 * Configuration for stream output smoothing.
 *
 * Controls the adaptive speed ramp that meters out streaming text
 * at a consistent pace regardless of how fast the model produces tokens.
 */
export type StreamSmoothingConfig = {
  /** Whether smoothing is enabled. Default: true */
  enabled: boolean;
  /** Minimum chars/sec at the start of streaming. Default: 60 */
  minSpeed?: number;
  /** Maximum chars/sec after ramp completes. Default: 600 */
  maxSpeed?: number;
  /** Duration in ms to ramp from minSpeed to maxSpeed. Default: 4000 */
  rampDuration?: number;
};

/** Default tick interval in ms (~60fps) */
const TICK_INTERVAL = 16;

/**
 * Buffers incoming streaming text and releases it at an adaptive rate.
 *
 * Creates a smooth "typing" effect regardless of how fast the model
 * produces tokens. Starts slow and ramps up, giving a natural feel.
 *
 * @example
 * ```ts
 * const smoother = new StreamSmoother((text) => {
 *   appendToUI(text);
 * });
 *
 * // Called rapidly as chunks arrive from SSE:
 * smoother.push("Hello ");
 * smoother.push("world, this is a long response...");
 *
 * // When stream ends:
 * smoother.flush();
 * ```
 */
export class StreamSmoother {
  private buffer = "";
  private callback: (text: string) => void;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startTime = 0;
  private destroyed = false;
  private drainResolve: (() => void) | null = null;

  private readonly enabled: boolean;
  private readonly minSpeed: number;
  private readonly maxSpeed: number;
  private readonly rampDuration: number;

  constructor(
    callback: (text: string) => void,
    config?: StreamSmoothingConfig | boolean
  ) {
    this.callback = callback;
    if (typeof config === "boolean" || config === undefined) {
      this.enabled = config !== false;
      this.minSpeed = 60;
      this.maxSpeed = 600;
      this.rampDuration = 4000;
    } else {
      this.enabled = config.enabled !== false;
      this.minSpeed = config.minSpeed ?? 60;
      this.maxSpeed = config.maxSpeed ?? 600;
      this.rampDuration = config.rampDuration ?? 4000;
    }
  }

  /**
   * Add text to the buffer. If smoothing is disabled, passes through immediately.
   */
  push(text: string): void {
    if (this.destroyed || !text) return;

    if (!this.enabled) {
      this.callback(text);
      return;
    }

    this.buffer += text;
    this.ensureTimer();
  }

  /**
   * Immediately release all remaining buffered text.
   * Call this when the stream finishes and you don't need pacing.
   */
  flush(): void {
    if (this.destroyed) return;
    this.stopTimer();

    if (this.buffer.length > 0) {
      const text = this.buffer;
      this.buffer = "";
      this.callback(text);
    }

    this.resolveDrain();
  }

  /**
   * Continue pacing the remaining buffer at maxSpeed, then resolve.
   * Call this when the stream ends to keep the smooth output going
   * instead of dumping everything at once.
   */
  drain(): Promise<void> {
    if (this.destroyed || !this.enabled) {
      this.flush();
      return Promise.resolve();
    }

    if (this.buffer.length === 0) {
      this.stopTimer();
      return Promise.resolve();
    }

    // Ensure the timer is running to drain the buffer
    this.ensureTimer();

    return new Promise<void>((resolve) => {
      this.drainResolve = resolve;
    });
  }

  /**
   * Stop the smoother and discard any remaining buffer.
   * Call this on abort or unmount.
   */
  destroy(): void {
    this.destroyed = true;
    this.stopTimer();
    this.buffer = "";
    this.resolveDrain();
  }

  /** Start the release timer if not already running */
  private ensureTimer(): void {
    if (this.timer !== null) return;

    if (this.startTime === 0) {
      this.startTime = Date.now();
    }

    this.timer = setInterval(() => this.tick(), TICK_INTERVAL);
  }

  /** Stop the release timer */
  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Resolve the drain promise if one is pending */
  private resolveDrain(): void {
    if (this.drainResolve) {
      const resolve = this.drainResolve;
      this.drainResolve = null;
      resolve();
    }
  }

  /** Release a calculated number of characters from the buffer */
  private tick(): void {
    if (this.destroyed || this.buffer.length === 0) {
      this.stopTimer();
      this.resolveDrain();
      return;
    }

    const elapsed = Date.now() - this.startTime;
    const currentSpeed = this.getCurrentSpeed(elapsed);
    const charsThisTick = Math.max(1, Math.round(currentSpeed * (TICK_INTERVAL / 1000)));

    const toRelease = Math.min(charsThisTick, this.buffer.length);
    const text = this.buffer.slice(0, toRelease);
    this.buffer = this.buffer.slice(toRelease);

    this.callback(text);

    if (this.buffer.length === 0) {
      this.stopTimer();
      this.resolveDrain();
    }
  }

  /** Calculate current output speed based on elapsed time */
  private getCurrentSpeed(elapsed: number): number {
    if (elapsed >= this.rampDuration) {
      return this.maxSpeed;
    }
    const progress = elapsed / this.rampDuration;
    return this.minSpeed + (this.maxSpeed - this.minSpeed) * progress;
  }
}
