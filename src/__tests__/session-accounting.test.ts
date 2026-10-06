import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTimerStore, HYPERFOCUS_IDLE_WARNING_MS, HYPERFOCUS_IDLE_GRACE_MS } from '@/stores/timerStore'
import { buildDayStats } from '@/lib/stats'
import { DEFAULT_SETTINGS, type FocusSession } from '@/types'

const initialState = useTimerStore.getInitialState()
const store = () => useTimerStore.getState()
const MINUTE = 60000
const WARNING_SECONDS = HYPERFOCUS_IDLE_WARNING_MS / 1000

beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-06T12:00:00-03:00'))
    useTimerStore.setState({ ...initialState, settings: DEFAULT_SETTINGS })
})

afterEach(() => vi.useRealTimers())

// What TimerRunner does when the countdown reaches zero with hyperfocus on.
function finishFocusIntoHyperfocus() {
    store().tick()
    store().enterHyperfocus()
}

describe('skip', () => {
    it('saves focus plus hyperfocus time as a finished Pomodoro', () => {
        store().toggleHyperfocus()
        store().start()
        vi.advanceTimersByTime(25 * MINUTE)
        finishFocusIntoHyperfocus()
        vi.advanceTimersByTime(23 * MINUTE)
        store().skip()

        const [session] = store().pendingSessions
        expect(session.actualDurationSeconds).toBe(48 * 60)
        expect(session.hyperfocusSeconds).toBe(23 * 60)
        expect(session.completed).toBe(true)
    })

    it('saves the time studied so far when skipping mid-focus', () => {
        store().start()
        vi.advanceTimersByTime(10 * MINUTE)
        store().skip()

        expect(store().pendingSessions[0].actualDurationSeconds).toBe(10 * 60)
        expect(store().pendingSessions[0].completed).toBe(false)
        expect(store().completedPomodoros).toBe(1)
    })

    it('ignores a focus skipped before one minute', () => {
        store().start()
        vi.advanceTimersByTime(5000)
        store().skip()

        expect(store().pendingSessions).toHaveLength(0)
        expect(store().completedPomodoros).toBe(0)
        expect(store().mode).toBe('shortBreak')
    })
})

describe('unattended hyperfocus', () => {
    it('counts at most the warning period after the focus ends when nobody returns', () => {
        store().toggleHyperfocus()
        store().start()
        vi.advanceTimersByTime(10 * 60 * MINUTE) // tab closed or device asleep
        finishFocusIntoHyperfocus()
        store().tick()

        expect(store().status).toBe('paused')
        expect(store().pausedFromHyperfocus).toBe(true)
        expect(store().hyperfocusSeconds).toBe(WARNING_SECONDS)

        store().skip()
        expect(store().pendingSessions[0].actualDurationSeconds).toBe(25 * 60 + WARNING_SECONDS)
    })

    it('drops only the unanswered time after the warning', () => {
        store().toggleHyperfocus()
        store().start()
        vi.advanceTimersByTime(25 * MINUTE)
        finishFocusIntoHyperfocus()
        vi.advanceTimersByTime(10 * MINUTE)
        store().markActivity()
        vi.advanceTimersByTime(HYPERFOCUS_IDLE_WARNING_MS + HYPERFOCUS_IDLE_GRACE_MS + MINUTE)
        store().tick()

        expect(store().status).toBe('paused')
        expect(store().hyperfocusSeconds).toBe(10 * 60 + WARNING_SECONDS)
    })

    it('keeps counting while the user keeps interacting', () => {
        store().toggleHyperfocus()
        store().start()
        vi.advanceTimersByTime(25 * MINUTE)
        finishFocusIntoHyperfocus()
        for (let i = 0; i < 6; i++) {
            vi.advanceTimersByTime(20 * MINUTE)
            store().markActivity()
        }
        store().tick()

        expect(store().status).toBe('hyperfocus')
        expect(store().hyperfocusSeconds).toBe(120 * 60)
    })

    it('settles the gap before a returning user’s first interaction counts', () => {
        store().toggleHyperfocus()
        store().start()
        vi.advanceTimersByTime(25 * MINUTE)
        finishFocusIntoHyperfocus()
        vi.advanceTimersByTime(5 * 60 * MINUTE)
        store().markActivity()

        expect(store().status).toBe('paused')
        expect(store().hyperfocusSeconds).toBe(WARNING_SECONDS)
    })

    it('does not pause hyperfocus at once after a quiet focus phase', () => {
        store().updateSettings({ focusDuration: 60 })
        store().toggleHyperfocus()
        store().start()
        vi.advanceTimersByTime(60 * MINUTE) // reading, no interaction
        finishFocusIntoHyperfocus()
        vi.advanceTimersByTime(MINUTE)
        store().tick()

        expect(store().status).toBe('hyperfocus')
        expect(store().hyperfocusSeconds).toBe(60)
    })
})

describe('persistence across tabs', () => {
    it('does not rewrite storage on every tick', () => {
        store().start()
        const before = localStorage.getItem('pomodoro-timer-storage')
        vi.advanceTimersByTime(5000)
        store().tick()
        expect(store().secondsRemaining).toBe(25 * 60 - 5)
        expect(localStorage.getItem('pomodoro-timer-storage')).toBe(before)
    })

    it('adopts sessions saved by another tab on rehydrate', async () => {
        store().start()
        vi.advanceTimersByTime(2 * MINUTE)
        store().reset()
        const saved = localStorage.getItem('pomodoro-timer-storage')!

        useTimerStore.setState({ ...initialState, settings: DEFAULT_SETTINGS })
        localStorage.setItem('pomodoro-timer-storage', saved)
        await useTimerStore.persist.rehydrate()
        expect(store().pendingSessions).toHaveLength(1)
    })
})

describe('daily totals', () => {
    it('adds up seconds before rounding to minutes', () => {
        const sessions: FocusSession[] = Array.from({ length: 10 }, (_, i) => ({
            id: String(i),
            userId: '',
            startedAt: '2026-10-06T15:00:00Z',
            durationMinutes: 4,
            actualDurationSeconds: 299,
            hyperfocusSeconds: 0,
            completed: false,
            createdAt: '',
        }))
        const [day] = buildDayStats(sessions)
        expect(day.totalSeconds).toBe(2990)
        expect(day.totalMinutes).toBe(49)
    })
})
