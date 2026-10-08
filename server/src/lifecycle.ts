import type { NextFunction, Request, Response } from 'express';

/**
 * Shared between the app and the shutdown sequence: whether the instance is draining, and how many
 * requests are still being handled.
 */
export interface Lifecycle {
  readonly draining: boolean;
  readonly inFlight: number;
  /** Readiness starts answering 503, so the load balancer stops sending traffic. */
  beginDrain(): void;
  /** Counts a request from arrival until its response finishes or its client goes away. */
  readonly track: (req: Request, res: Response, next: NextFunction) => void;
  /** Resolves once no request is in flight. */
  idle(): Promise<void>;
}

export function createLifecycle(): Lifecycle {
  let draining = false;
  let inFlight = 0;
  let waiters: (() => void)[] = [];

  const settle = () => {
    if (inFlight > 0) return;
    const pending = waiters;
    waiters = [];
    for (const resolve of pending) resolve();
  };

  return {
    get draining() {
      return draining;
    },
    get inFlight() {
      return inFlight;
    },
    beginDrain() {
      draining = true;
    },
    track: (_req, res, next) => {
      inFlight += 1;
      let done = false;
      // `finish` for a completed response, `close` for a client that went away first; count once.
      const finished = () => {
        if (done) return;
        done = true;
        inFlight -= 1;
        settle();
      };
      res.once('finish', finished);
      res.once('close', finished);
      next();
    },
    idle() {
      return inFlight === 0
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            waiters.push(resolve);
          });
    },
  };
}
