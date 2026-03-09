type TimerEntry = {
  timeout: NodeJS.Timeout;
  interval: NodeJS.Timeout;
  endsAt: number;
};

class DebateTimerManager {
  private timers: Map<string, TimerEntry> = new Map();

  startTurnTimer(
    debateId: string,
    seconds: number,
    onExpire: () => void,
    onTick?: (secondsRemaining: number) => void
  ) {
    this.clearTimer(debateId);

    const endsAt = Date.now() + seconds * 1000;

    const timeout = setTimeout(() => {
      this.clearTimer(debateId);
      onExpire();
    }, seconds * 1000);

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      if (onTick) onTick(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    this.timers.set(debateId, { timeout, interval, endsAt });
  }

  clearTimer(debateId: string) {
    const entry = this.timers.get(debateId);
    if (entry) {
      clearTimeout(entry.timeout);
      clearInterval(entry.interval);
      this.timers.delete(debateId);
    }
  }

  getRemaining(debateId: string): number {
    const entry = this.timers.get(debateId);
    if (!entry) return 0;
    return Math.max(0, Math.ceil((entry.endsAt - Date.now()) / 1000));
  }

  isActive(debateId: string): boolean {
    return this.timers.has(debateId);
  }
}

export const timerManager = new DebateTimerManager();
