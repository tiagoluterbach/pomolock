# Timer clock

The timer measures elapsed time using a persisted `Date.now()` anchor and
millisecond balances in the Zustand store. Worker messages only request a
display refresh; delayed or duplicate messages do not change the duration.

- Pausing freezes both balances, including fractions of a second. Resuming
  creates a new anchor, excluding the paused interval.
- Reloading or returning to the page recalculates the current phase from its
  saved anchor, including time spent with the page closed or the device asleep.
- An expired phase completes once. If auto-start is enabled, the next phase
  starts when completion is processed; missed offline cycles are not generated.
- With hyperfocus enabled, time since the focus deadline becomes overtime.
- Legacy saved timers without an anchor resume from their last saved seconds;
  their missing elapsed time cannot be reconstructed reliably.

This does not guarantee alarm delivery while the browser or device is suspended.
The persisted clock uses the device's wall clock, so changing the system time
can affect elapsed time.

Regression tests cover a simulated hour, duplicate wake-ups, pause fractions,
reloads, midnight, legacy persistence, hyperfocus, auto-start and worker fallback.
Run them with `pnpm test:run`; type-check with `pnpm exec tsc --noEmit`.
