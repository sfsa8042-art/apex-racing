"use client";
import { useRef, useEffect, useCallback } from "react";

/**
 * Returns a throttled version of a setter that coalesces rapid calls into at
 * most one update per animation frame. Ideal for cursor/scrub position that
 * fires on every mousemove (60+/sec) but only needs to update once per frame.
 */
export function useRafThrottle<T>(setter: (value: T) => void): (value: T) => void {
  const frame = useRef<number>(0);
  const pending = useRef<T | null>(null);
  const hasPending = useRef(false);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return useCallback((value: T) => {
    pending.current = value;
    hasPending.current = true;
    if (frame.current) return;             // already scheduled this frame
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      if (hasPending.current) {
        hasPending.current = false;
        setter(pending.current as T);
      }
    });
  }, [setter]);
}
