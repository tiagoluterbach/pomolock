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
    // Last time (ms) the user interacted with the app; bounds hyperfocus overtime.
    lastActivityAt: number | null
    // Part of this phase already saved as sessions when a page closed. Later
    // saves only add what came after it, so sessions never overlap.
    recordedSeconds: number
    recordedHyperfocusSeconds: number
    // When the last page showing this timer closed; cleared by the next one.
    closedAt: number | null

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
    markActivity: () => void
    markPageClosed: () => void
    settleClosedPage: () => void
    clearPageClosed: () => void
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

// Hyperfocus has no deadline, so overtime is only trusted while someone is
// around: after this long without interaction the user is asked to confirm,
// and if nobody answers, hyperfocus pauses and the unanswered time is dropped.
export const HYPERFOCUS_IDLE_WARNING_MS = 90 * 60 * 1000
export const HYPERFOCUS_IDLE_GRACE_MS = 5 * 60 * 1000

// Closing the page ends the session at that moment, unless a page comes back
// within this long (a reload or a tab closed by accident), which resumes it.
export const CLOSED_PAGE_GRACE_MS = 5 * 60 * 1000

// Partial sessions need at least this much time to count.
const MIN_SESSION_SECONDS = 60

const NOTHING_RECORDED = { recordedSeconds: 0, recordedHyperfocusSeconds: 0, closedAt: null }

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

/** A session is open: timer settings stay locked until it ends. */
export function isSessionInProgress(status: TimerStatus): boolean {
    return isActive(status)
}

/**
 * "No giving up" hides the ways out of a focus countdown. Hyperfocus means the
 * Pomodoro already finished, so leaving it is allowed again.
 */
export function isGivingUpLocked(
    state: Pick<TimerState, 'mode' | 'status' | 'pausedFromHyperfocus' | 'settings'>,
): boolean {
    return (
        state.settings.noGiveUp &&
        state.mode === 'focus' &&
        (state.status === 'running' || (state.status === 'paused' && !state.pausedFromHyperfocus))
    )
}

type SessionSource = Pick<
    TimerState,
    | 'mode'
    | 'settings'
    | 'secondsRemaining'
    | 'hyperfocusSeconds'
    | 'phaseDuration'
    | 'sessionStartedAt'
    | 'recordedSeconds'
    | 'recordedHyperfocusSeconds'
>

// Older persisted snapshots have no phaseDuration; fall back to the settings.
function getPhaseDuration(state: SessionSource): number {
    return state.phaseDuration ?? getDurationForMode(state.mode, state.settings)
}

function getElapsedSeconds(state: SessionSource): number {
    return Math.round(getPhaseDuration(state) - state.secondsRemaining + state.hyperfocusSeconds)
}

// Hyperfocus left unattended past the warning and its grace period.
function isIdleHyperfocus(state: Pick<TimerState, 'status' | 'lastActivityAt'>, now = Date.now()): boolean {
    return (
        state.status === 'hyperfocus' &&
        state.lastActivityAt !== null &&
        now - state.lastActivityAt >= HYPERFOCUS_IDLE_WARNING_MS + HYPERFOCUS_IDLE_GRACE_MS
    )
}

// Time of this phase not yet saved as a session.
function getUnrecordedSeconds(state: SessionSource): number {
    return getElapsedSeconds(state) - state.recordedSeconds
}

// Sessions share the phase's startedAt, so the time stays on the day it began
// and the stats can tell they are parts of one Pomodoro.
function buildSession(state: SessionSource, completed: boolean): FocusSession {
    const elapsedSeconds = getUnrecordedSeconds(state)
    return {
        id: generateId(),
        userId: '',
        startedAt: state.sessionStartedAt!,
        durationMinutes: Math.floor(elapsedSeconds / 60),
        actualDurationSeconds: elapsedSeconds,
        hyperfocusSeconds: Math.max(0, state.hyperfocusSeconds - state.recordedHyperfocusSeconds),
        completed,
        createdAt: new Date().toISOString(),
    }
}

// Partial sessions (reset, mode switch, closed page, stale recovery) need at least 1 minute.
function shouldSavePartialSession(state: SessionSource & Pick<TimerState, 'status'>): boolean {
    return (
        state.mode === 'focus' &&
        isActive(state.status) &&
        !!state.sessionStartedAt &&
        getElapsedSeconds(state) >= MIN_SESSION_SECONDS &&
        getUnrecordedSeconds(state) > 0
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
            lastActivityAt: null,
            ...NOTHING_RECORDED,

            // Settings
            settings: DEFAULT_SETTINGS,

            // Sync
            pendingSessions: [],
            cloudSessions: [],

            // Actions
            setMode: (mode) => {
                if (isGivingUpLocked(get())) return
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
                    ...NOTHING_RECORDED,
                })
            },

            start: () => {
                const state = get()
                const { status, sessionStartedAt, pausedFromHyperfocus } = state
                if (status === 'running' || status === 'hyperfocus') return
                const clock = readClock(state)
                const lastActivityAt = Date.now()
                if (pausedFromHyperfocus) {
                    // Resume hyperfocus counting
                    set({ status: 'hyperfocus', pausedFromHyperfocus: false, clock, ...clockDisplay(clock), lastActivityAt })
                } else {
                    set({
                        status: 'running',
                        clock,
                        ...clockDisplay(clock),
                        lastActivityAt,
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
                if (isGivingUpLocked(get())) return
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
                    ...NOTHING_RECORDED,
                })
            },

            skip: () => {
                if (isGivingUpLocked(get())) return
                get().tick()
                const state = get()
                const { mode, completedPomodoros, settings, sessionStartedAt, lastPomodoroDate } = state
                const dailyPomodoros = getDailyPomodoros(completedPomodoros, lastPomodoroDate)
                const nextMode = getNextMode(mode, dailyPomodoros, settings)
                // Like reset, a skipped focus needs at least a minute to count.
                const countsAsSession =
                    mode === 'focus' && !!sessionStartedAt && getElapsedSeconds(state) >= MIN_SESSION_SECONDS
                const newPomodoros = countsAsSession ? dailyPomodoros + 1 : dailyPomodoros

                if (countsAsSession && getUnrecordedSeconds(state) > 0) {
                    // Skipping after the countdown ended (hyperfocus) still finished the Pomodoro.
                    get().addPendingSession(buildSession(state, state.secondsRemaining === 0))
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
                    ...NOTHING_RECORDED,
                })
            },

            complete: () => {
                const state = get()
                const { mode, completedPomodoros, settings, sessionStartedAt, lastPomodoroDate } = state
                const dailyPomodoros = getDailyPomodoros(completedPomodoros, lastPomodoroDate)
                const nextMode = getNextMode(mode, dailyPomodoros, settings)
                const newPomodoros = mode === 'focus' ? dailyPomodoros + 1 : dailyPomodoros

                // Save completed session if focus mode
                if (mode === 'focus' && sessionStartedAt && getUnrecordedSeconds(state) > 0) {
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
                    ...NOTHING_RECORDED,
                })
            },

            tick: () => {
                const state = get()
                if (state.status !== 'running' && state.status !== 'hyperfocus') return
                const now = Date.now()
                if (isIdleHyperfocus(state, now)) {
                    // Count overtime only up to the warning; the unanswered rest is dropped.
                    const clock = readClock(state, now)
                    const unattendedMs = now - (state.lastActivityAt! + HYPERFOCUS_IDLE_WARNING_MS)
                    clock.hyperfocusMs = Math.max(0, clock.hyperfocusMs - unattendedMs)
                    set({ status: 'paused', pausedFromHyperfocus: true, clock, ...clockDisplay(clock) })
                    return
                }
                const clock = readClock(state, now)
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
                // Inactivity is measured from the end of the countdown at the earliest,
                // so a quiet focus phase (e.g. reading) does not pause hyperfocus at once.
                const deadline = elapsedClock.anchoredAt - clock.hyperfocusMs
                set({
                    status: 'hyperfocus',
                    clock,
                    ...clockDisplay(clock),
                    lastActivityAt: Math.max(state.lastActivityAt ?? deadline, deadline),
                })
            },

            exitHyperfocus: () => {
                get().tick()
                const state = get()
                const { mode, completedPomodoros, settings, sessionStartedAt, lastPomodoroDate } = state
                const dailyPomodoros = getDailyPomodoros(completedPomodoros, lastPomodoroDate)
                const nextMode = getNextMode(mode, dailyPomodoros, settings)
                const newPomodoros = dailyPomodoros + 1

                // Save session with hyperfocus time
                if (sessionStartedAt && getUnrecordedSeconds(state) > 0) {
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
                    ...NOTHING_RECORDED,
                })
            },

            toggleHyperfocus: () => {
                const { hyperfocusEnabled } = get()
                set({ hyperfocusEnabled: !hyperfocusEnabled })
            },

            markActivity: () => {
                // Settle an unattended hyperfocus before the returning user's first
                // event refreshes the activity time and hides the gap.
                get().tick()
                const state = get()
                // An expired focus becomes hyperfocus on the runner's next refresh,
                // which settles the gap; the following event records activity.
                if (state.status === 'running' && state.secondsRemaining === 0) return
                set({ lastActivityAt: Date.now() })
            },

            markPageClosed: () => {
                get().tick()
                const state = get()
                if (!isActive(state.status)) return
                const updates: Partial<TimerState> = { closedAt: Date.now() }

                // Nothing can run once the page is gone, so save the time now.
                // Short remainders wait for the next save, to spare reloads a row each.
                if (
                    shouldSavePartialSession(state) &&
                    getUnrecordedSeconds(state) >= MIN_SESSION_SECONDS
                ) {
                    updates.pendingSessions = [
                        ...state.pendingSessions,
                        buildSession(state, state.secondsRemaining === 0),
                    ]
                    updates.recordedSeconds = getElapsedSeconds(state)
                    updates.recordedHyperfocusSeconds = state.hyperfocusSeconds
                }
                set(updates)
            },

            settleClosedPage: () => {
                const state = get()
                const { closedAt } = state
                if (closedAt === null) return

                // Back soon, or paused (no time passes): carry on where it was.
                if (state.status === 'paused' || Date.now() - closedAt <= CLOSED_PAGE_GRACE_MS) {
                    set({ closedAt: null })
                    return
                }

                // Gone for good: the session ended when the page closed. The time
                // away is not study time, even if the countdown ran out meanwhile.
                const atClose = { ...state, ...clockDisplay(readClock(state, closedAt)) }
                if (shouldSavePartialSession(atClose)) {
                    get().addPendingSession(buildSession(atClose, atClose.secondsRemaining === 0))
                }
                // Only hyperfocus closes with the countdown already finished.
                const finishedPomodoro =
                    atClose.mode === 'focus' &&
                    atClose.secondsRemaining === 0 &&
                    getLocalDateString(new Date(closedAt)) === getLocalDateString()

                set({
                    mode: 'focus',
                    status: 'idle',
                    clock: null,
                    phaseDuration: null,
                    secondsRemaining: getDurationForMode('focus', state.settings),
                    hyperfocusSeconds: 0,
                    sessionStartedAt: null,
                    pausedFromHyperfocus: false,
                    ...NOTHING_RECORDED,
                    ...(finishedPomodoro ? {
                        completedPomodoros: getDailyPomodoros(state.completedPomodoros, state.lastPomodoroDate) + 1,
                        lastPomodoroDate: getLocalDateString(),
                    } : {}),
                })
            },

            clearPageClosed: () => {
                if (get().closedAt !== null) set({ closedAt: null })
            },

            updateSettings: (newSettings) => {
                const state = get()
                const { settings, mode, status } = state
                const merged = { ...settings, ...newSettings }
                const updates: Partial<TimerState> = { settings: merged }

                // If timer is idle, update the remaining seconds to match new durations
                if (status === 'idle') {
                    updates.secondsRemaining = getDurationForMode(mode, merged)
                }
                // A session in progress keeps the length it started with; new
                // durations apply from the next phase. Pin it for old snapshots
                // that still derive it from the settings.
                else if (state.phaseDuration === null) {
                    updates.phaseDuration = getPhaseDuration(state)
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
            // Display seconds are left out while a clock exists (they are derived
            // from it), so ticks do not rewrite storage and wake other tabs.
            partialize: (state) => ({
                settings: state.settings,
                completedPomodoros: state.completedPomodoros,
                lastPomodoroDate: state.lastPomodoroDate,
                hyperfocusEnabled: state.hyperfocusEnabled,
                mode: state.mode,
                status: state.status,
                ...(state.clock ? {} : {
                    secondsRemaining: state.secondsRemaining,
                    hyperfocusSeconds: state.hyperfocusSeconds,
                }),
                pausedFromHyperfocus: state.pausedFromHyperfocus,
                sessionStartedAt: state.sessionStartedAt,
                clock: state.clock,
                phaseDuration: state.phaseDuration,
                lastActivityAt: state.lastActivityAt,
                recordedSeconds: state.recordedSeconds,
                recordedHyperfocusSeconds: state.recordedHyperfocusSeconds,
                closedAt: state.closedAt,
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
                        Object.assign(merged, NOTHING_RECORDED)
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
