# Timer clock

The timer measures elapsed time using a persisted `Date.now()` anchor and
millisecond balances in the Zustand store. Worker messages only request a
display refresh; delayed or duplicate messages do not change the duration.

- Pausing freezes both balances, including fractions of a second. Resuming
  creates a new anchor, excluding the paused interval.
- Returning to the page recalculates the current phase from its saved anchor,
  including time spent with the device asleep or the app killed by the system
  (the user may be studying with the phone locked).
- Closing the page (`pagehide`) saves the time studied so far as a session and
  uploads it right away with a `keepalive` request, so other devices see it even
  if this one never reopens. Coming back within 5 minutes (a reload, a tab closed
  by accident) resumes the phase, and later saves only add the time after that
  first part. Coming back later ends the session at the moment of closing: the
  time away is not counted and the timer returns to an idle focus. A paused
  session stays paused. Android may kill an installed app without `pagehide`;
  that case follows the previous rule.
- An expired phase completes once. If auto-start is enabled, the next phase
  starts when completion is processed; missed offline cycles are not generated.
- With hyperfocus enabled, time since the focus deadline becomes overtime.
  Overtime needs someone present: after 90 minutes without interaction (counted
  from the deadline at the earliest) the app asks "Still studying?"; if nobody
  answers within 5 minutes, hyperfocus pauses and only the time up to the
  warning is kept. This also caps overtime recorded while the page was closed.
- Several open tabs share one saved timer: each adopts the others' writes, so
  sessions are not overwritten or recorded twice.
- Legacy saved timers without an anchor resume from their last saved seconds;
  their missing elapsed time cannot be reconstructed reliably.

This does not guarantee alarm delivery while the browser or device is suspended.
The persisted clock uses the device's wall clock, so changing the system time
can affect elapsed time.

Regression tests cover a simulated hour, duplicate wake-ups, pause fractions,
reloads, midnight, legacy persistence, hyperfocus, auto-start and worker fallback.
Run them with `pnpm test:run`; type-check with `pnpm exec tsc --noEmit`.
