import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
    type TimerMode,
    type TimerStatus,
    type AppSettings,
    type FocusSession,
    DEFAULT_SETTINGS,
} from '@/types'
import { getLocalDateString } from '@/lib/utils'

// Unique ID generator that works in both browser and test environments
function generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID()
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

// ==========================================
// Timer Store Types
// ==========================================

interface TimerClock {
    anchoredAt: number
    remainingMs: number
    hyperfocusMs: number
}

interface TimerState {
    // Timer state
    mode: TimerMode
    status: TimerStatus
    secondsRemaining: number
    hyperfocusSeconds: number
    completedPomodoros: number
    lastPomodoroDate: string | null  // YYYY-MM-DD local date
    sessionStartedAt: string | null
    hyperfocusEnabled: boolean
    pausedFromHyperfocus: boolean
    clock: TimerClock | null
    // Length (seconds) of the active phase, fixed when it starts so that
    // editing settings mid-session never rewrites time already studied.
    phaseDuration: number | null

    // Settings
    settings: AppSettings

    // Sync
    pendingSessions: FocusSession[]
    cloudSessions: FocusSession[]

    // Actions
    setMode: (mode: TimerMode) => void
    start: () => void
    pause: () => void
    reset: () => void
    skip: () => void
    complete: () => void
    tick: () => void
    tickHyperfocus: () => void
    enterHyperfocus: () => void
    exitHyperfocus: () => void
    toggleHyperfocus: () => void
    updateSettings: (settings: Partial<AppSettings>) => void
    resetStats: () => void

    // Sync actions
    addPendingSession: (session: FocusSession) => void
    removeSyncedSessions: (ids: string[]) => void
    replaceSettings: (settings: AppSettings) => void
    setCloudSessions: (sessions: FocusSession[]) => void
}

// ==========================================
// Helper Functions
// ==========================================

export function getDurationForMode(mode: TimerMode, settings: AppSettings): number {
    switch (mode) {
        case 'focus':
            return settings.focusDuration * 60
        case 'shortBreak':
            return settings.shortBreakDuration * 60
        case 'longBreak':
            return settings.longBreakDuration * 60
    }
}

export function getNextMode(
    currentMode: TimerMode,
    completedPomodoros: number,
    settings: AppSettings
): TimerMode {
    if (currentMode === 'focus') {
        const nextPomodoros = completedPomodoros + 1
        if (nextPomodoros % settings.pomodorosUntilLongBreak === 0) {
            return 'longBreak'
        }
        return 'shortBreak'
    }
    return 'focus'
}

// Helper to get the correct pomodoro count, resetting if the day changed
function getDailyPomodoros(completedPomodoros: number, lastPomodoroDate: string | null): number {
    const today = getLocalDateString()
    if (lastPomodoroDate !== today) {
        return 0 // Day changed, reset
    }
    return completedPomodoros
}

// The persisted anchor is the source of truth. Ticks only refresh the display;
// their frequency (or duplication) must never change the measured duration.
function readClock(state: TimerState, now = Date.now()): TimerClock {
    const clock = state.clock ?? {
        anchoredAt: now,
        remainingMs: state.secondsRemaining * 1000,
        hyperfocusMs: state.hyperfocusSeconds * 1000,
    }
    const elapsed = Math.max(0, now - clock.anchoredAt)
    return {
        anchoredAt: now,
        remainingMs: clock.remainingMs - (state.status === 'running' ? elapsed : 0),
        hyperfocusMs: clock.hyperfocusMs + (state.status === 'hyperfocus' ? elapsed : 0),
    }
}

function clockDisplay(clock: TimerClock) {
    return {
        secondsRemaining: Math.max(0, Math.ceil(clock.remainingMs / 1000)),
        hyperfocusSeconds: Math.floor(clock.hyperfocusMs / 1000),
    }
}

function isActive(status: TimerStatus): boolean {
    return status === 'running' || status === 'paused' || status === 'hyperfocus'
}

type SessionSource = Pick<
    TimerState,
    'mode' | 'settings' | 'secondsRemaining' | 'hyperfocusSeconds' | 'phaseDuration' | 'sessionStartedAt'
>

// Older persisted snapshots have no phaseDuration; fall back to the settings.
function getPhaseDuration(state: SessionSource): number {
    return state.phaseDuration ?? getDurationForMode(state.mode, state.settings)
}

function getElapsedSeconds(state: SessionSource): number {
    return Math.round(getPhaseDuration(state) - state.secondsRemaining + state.hyperfocusSeconds)
}

function buildSession(state: SessionSource, completed: boolean): FocusSession {
    const elapsedSeconds = getElapsedSeconds(state)
    return {
        id: generateId(),
        userId: '',
        startedAt: state.sessionStartedAt!,
        durationMinutes: Math.floor(elapsedSeconds / 60),
        actualDurationSeconds: elapsedSeconds,
        hyperfocusSeconds: state.hyperfocusSeconds,
        completed,
        createdAt: new Date().toISOString(),
    }
}

// Partial sessions (reset, mode switch, stale recovery) need at least 1 minute.
function shouldSavePartialSession(state: SessionSource & Pick<TimerState, 'status'>): boolean {
    return (
        state.mode === 'focus' &&
        isActive(state.status) &&
        !!state.sessionStartedAt &&
        getElapsedSeconds(state) >= 60
    )
}

// ==========================================
// Timer Store
// ==========================================

export const useTimerStore = create<TimerState>()(
    persist(
        (set, get) => ({
            // Initial state
            mode: 'focus',
            status: 'idle',
            secondsRemaining: DEFAULT_SETTINGS.focusDuration * 60,
            hyperfocusSeconds: 0,
            completedPomodoros: 0,
            lastPomodoroDate: null,
            sessionStartedAt: null,
            hyperfocusEnabled: false,
            pausedFromHyperfocus: false,
            clock: null,
            phaseDuration: null,

            // Settings
            settings: DEFAULT_SETTINGS,

            // Sync
            pendingSessions: [],
            cloudSessions: [],

            // Actions
            setMode: (mode) => {
                get().tick()
                const state = get()

                // Save partial session if switching away from an active focus mode
                if (shouldSavePartialSession(state)) {
                    get().addPendingSession(buildSession(state, false))
                }

                set({
                    mode,
                    status: 'idle',
                    clock: null,
                    phaseDuration: null,
                    secondsRemaining: getDurationForMode(mode, state.settings),
                    hyperfocusSeconds: 0,
                    sessionStartedAt: null,
                    pausedFromHyperfocus: false,
                })
            },

            start: () => {
                const state = get()
                const { status, sessionStartedAt, pausedFromHyperfocus } = state
                if (status === 'running' || status === 'hyperfocus') return
                const clock = readClock(state)
                if (pausedFromHyperfocus) {
                    // Resume hyperfocus counting
                    set({ status: 'hyperfocus', pausedFromHyperfocus: false, clock, ...clockDisplay(clock) })
                } else {
                    set({
                        status: 'running',
                        clock,
                        ...clockDisplay(clock),
                        phaseDuration: status === 'idle' ? state.secondsRemaining : getPhaseDuration(state),
                        sessionStartedAt:
                            status === 'idle'
                                ? new Date().toISOString()
                                : sessionStartedAt,
                    })
                }
            },

            pause: () => {
                const state = get()
                const { status } = state
                if (status !== 'running' && status !== 'hyperfocus') return
                const clock = readClock(state)
                set({
                    status: 'paused',
                    clock,
                    ...clockDisplay(clock),
                    pausedFromHyperfocus: status === 'hyperfocus',
                })
            },

            reset: () => {
                get().tick()
                const state = get()

                // Save partial session if resetting during a focus mode
                if (shouldSavePartialSession(state)) {
                    get().addPendingSession(buildSession(state, false))
                }

                set({
                    status: 'idle',
                    clock: null,
                    phaseDuration: null,
                    secondsRemaining: getDurationForMode(state.mode, state.settings),
                    hyperfocusSeconds: 0,
                    sessionStartedAt: null,
                    pausedFromHyperfocus: false,
                })
            },

            skip: () => {
                get().tick()
                const state = get()
                const { mode, completedPomodoros, settings, sessionStartedAt, lastPomodoroDate } = state
                const dailyPomodoros = getDailyPomodoros(completedPomodoros, lastPomodoroDate)
                const nextMode = getNextMode(mode, dailyPomodoros, settings)
                const newPomodoros =
                    mode === 'focus' ? dailyPomodoros + 1 : dailyPomodoros

                // Save full session if skipping a focus mode
                if (mode === 'focus' && sessionStartedAt) {
                    get().addPendingSession(buildSession(state, false))
                }

                set({
                    mode: nextMode,
                    status: 'idle',
                    clock: null,
                    phaseDuration: null,
                    secondsRemaining: getDurationForMode(nextMode, settings),
                    hyperfocusSeconds: 0,
                    completedPomodoros: newPomodoros,
                    lastPomodoroDate: getLocalDateString(),
                    sessionStartedAt: null,
                    pausedFromHyperfocus: false,
                })
            },

            complete: () => {
                const state = get()
                const { mode, completedPomodoros, settings, sessionStartedAt, lastPomodoroDate } = state
                const dailyPomodoros = getDailyPomodoros(completedPomodoros, lastPomodoroDate)
                const nextMode = getNextMode(mode, dailyPomodoros, settings)
                const newPomodoros = mode === 'focus' ? dailyPomodoros + 1 : dailyPomodoros

                // Save completed session if focus mode
                if (mode === 'focus' && sessionStartedAt) {
                    get().addPendingSession(buildSession(state, true))
                }

                // Determine if auto-start is enabled for the next mode
                const shouldAutoStart = (mode === 'focus' && settings.autoStartBreaks) ||
                    (mode !== 'focus' && settings.autoStartPomodoros)
                const nextDuration = getDurationForMode(nextMode, settings)

                set({
                    mode: nextMode,
                    status: shouldAutoStart ? 'running' : 'idle',
                    // A resumed page completes the expired phase once. Auto-start
                    // begins the next phase now, without inventing offline cycles.
                    clock: shouldAutoStart ? {
                        anchoredAt: Date.now(),
                        remainingMs: nextDuration * 1000,
                        hyperfocusMs: 0,
                    } : null,
                    phaseDuration: shouldAutoStart ? nextDuration : null,
                    secondsRemaining: nextDuration,
                    hyperfocusSeconds: 0,
                    completedPomodoros: newPomodoros,
                    lastPomodoroDate: getLocalDateString(),
                    sessionStartedAt: shouldAutoStart ? new Date().toISOString() : null,
                    pausedFromHyperfocus: false,
                })
            },

            tick: () => {
                const state = get()
                if (state.status !== 'running' && state.status !== 'hyperfocus') return
                const clock = readClock(state)
                const display = clockDisplay(clock)
                if (!state.clock || display.secondsRemaining !== state.secondsRemaining || display.hyperfocusSeconds !== state.hyperfocusSeconds) {
                    set({ ...display, ...(!state.clock ? { clock } : {}) })
                }
            },

            tickHyperfocus: () => {
                get().tick()
            },

            enterHyperfocus: () => {
                const state = get()
                const elapsedClock = readClock(state)
                const clock = {
                    anchoredAt: elapsedClock.anchoredAt,
                    remainingMs: 0,
                    hyperfocusMs: Math.max(0, -elapsedClock.remainingMs),
                }
                set({ status: 'hyperfocus', clock, ...clockDisplay(clock) })
            },

            exitHyperfocus: () => {
                get().tick()
                const state = get()
                const { mode, completedPomodoros, settings, sessionStartedAt, lastPomodoroDate } = state
                const dailyPomodoros = getDailyPomodoros(completedPomodoros, lastPomodoroDate)
                const nextMode = getNextMode(mode, dailyPomodoros, settings)
                const newPomodoros = dailyPomodoros + 1

                // Save session with hyperfocus time
                if (sessionStartedAt) {
                    get().addPendingSession(buildSession(state, true))
                }

                set({
                    mode: nextMode,
                    status: 'idle',
                    clock: null,
                    phaseDuration: null,
                    secondsRemaining: getDurationForMode(nextMode, settings),
                    hyperfocusSeconds: 0,
                    completedPomodoros: newPomodoros,
                    lastPomodoroDate: getLocalDateString(),
                    sessionStartedAt: null,
                    pausedFromHyperfocus: false,
                })
            },

            toggleHyperfocus: () => {
                const { hyperfocusEnabled } = get()
                set({ hyperfocusEnabled: !hyperfocusEnabled })
            },

            updateSettings: (newSettings) => {
                const state = get()
                const { settings, mode, status, pausedFromHyperfocus } = state
                const merged = { ...settings, ...newSettings }
                const updates: Partial<TimerState> = { settings: merged }

                // If timer is idle, update the remaining seconds to match new durations
                if (status === 'idle') {
                    updates.secondsRemaining = getDurationForMode(mode, merged)
                }
                // Running or paused: keep the time already studied and apply the
                // new length to what is left. Hyperfocus has no countdown to adjust.
                else if (status !== 'hyperfocus' && !pausedFromHyperfocus) {
                    const clock = readClock(state)
                    const elapsedMs = getPhaseDuration(state) * 1000 - clock.remainingMs
                    const newTotal = getDurationForMode(mode, merged)
                    const newRemainingMs = Math.max(0, newTotal * 1000 - elapsedMs)

                    updates.secondsRemaining = Math.ceil(newRemainingMs / 1000)
                    updates.clock = { ...clock, remainingMs: newRemainingMs }
                    // Never shrink below what was studied, so elapsed time survives
                    // even when the new duration is shorter than it.
                    updates.phaseDuration = (elapsedMs + newRemainingMs) / 1000
                }

                set(updates)
            },

            resetStats: () => {
                set({ completedPomodoros: 0, lastPomodoroDate: null, pendingSessions: [], cloudSessions: [] })
            },

            // Sync actions
            addPendingSession: (session) => {
                const { pendingSessions } = get()
                set({ pendingSessions: [...pendingSessions, session] })
            },

            removeSyncedSessions: (ids) => {
                const { pendingSessions } = get()
                set({
                    pendingSessions: pendingSessions.filter(
                        (s) => !ids.includes(s.id)
                    ),
                })
            },

            replaceSettings: (settings) => {
                const { mode, status } = get()
                const updates: Partial<TimerState> = { settings }
                // Recalculate timer when idle so synced durations apply
                if (status === 'idle') {
                    updates.secondsRemaining = getDurationForMode(mode, settings)
                }
                set(updates)
            },

            setCloudSessions: (sessions) => {
                set({ cloudSessions: sessions })
            },
        }),
        {
            name: 'pomodoro-timer-storage',
            // Persist timer state so navigation doesn't reset the timer
            partialize: (state) => ({
                settings: state.settings,
                completedPomodoros: state.completedPomodoros,
                lastPomodoroDate: state.lastPomodoroDate,
                hyperfocusEnabled: state.hyperfocusEnabled,
                mode: state.mode,
                status: state.status,
                secondsRemaining: state.secondsRemaining,
                hyperfocusSeconds: state.hyperfocusSeconds,
                pausedFromHyperfocus: state.pausedFromHyperfocus,
                sessionStartedAt: state.sessionStartedAt,
                clock: state.clock,
                phaseDuration: state.phaseDuration,
                pendingSessions: state.pendingSessions,
            }),
            // Deep merge to handle new settings fields (e.g. dashboardAccent)
            merge: (persisted, current) => {
                const p = persisted as Partial<TimerState> | undefined
                if (!p) return current
                const merged = { ...current, ...p }
                // Deep merge settings so new defaults aren't lost
                if (p.settings) {
                    merged.settings = {
                        ...current.settings,
                        ...p.settings,
                        modeColors: {
                            ...current.settings.modeColors,
                            ...(p.settings.modeColors ?? {}),
                        },
                    }
                }

                // Legacy sessions have no timestamp to recover elapsed time from.
                // Keep the old previous-day recovery only for those sessions.
                // Recover stale sessions: if there's an active focus session
                // from a previous day, auto-save the partial progress and reset
                if (
                    !p.clock &&
                    merged.mode === 'focus' &&
                    (merged.status === 'running' || merged.status === 'paused' || merged.status === 'hyperfocus') &&
                    merged.sessionStartedAt
                ) {
                    const sessionDay = getLocalDateString(new Date(merged.sessionStartedAt))
                    const today = getLocalDateString()

                    if (sessionDay !== today) {
                        const recovered = { ...merged, hyperfocusSeconds: merged.hyperfocusSeconds || 0 }
                        if (shouldSavePartialSession(recovered)) {
                            merged.pendingSessions = [...(merged.pendingSessions || []), buildSession(recovered, false)]
                        }

                        // Reset timer to idle
                        merged.status = 'idle'
                        merged.secondsRemaining = getDurationForMode('focus', merged.settings)
                        merged.hyperfocusSeconds = 0
                        merged.sessionStartedAt = null
                        merged.pausedFromHyperfocus = false
                        merged.clock = null
                        merged.phaseDuration = null
                    }
                }

                if (merged.status !== 'idle') {
                    // Migrate old snapshots using their saved seconds; never infer
                    // elapsed time from sessionStartedAt, which includes pauses.
                    merged.clock = p.clock ?? readClock({ ...merged, clock: null })
                    Object.assign(merged, clockDisplay(readClock(merged)))
                } else {
                    merged.clock = null
                }

                return merged
            },
        }
    )
)
