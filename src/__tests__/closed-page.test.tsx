import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TimerRunner } from '@/components/timer/TimerRunner'
import { CLOSED_PAGE_GRACE_MS, useTimerStore } from '@/stores/timerStore'
import { buildDayStats } from '@/lib/stats'
import { DEFAULT_SETTINGS } from '@/types'

class TimerWorker {
    onmessage: ((event: { data: { type: string } }) => void) | null = null
    onerror: (() => void) | null = null
    postMessage = vi.fn()
    terminate = vi.fn()
}

const MINUTE = 60000
const store = () => useTimerStore.getState()
const initialState = useTimerStore.getInitialState()
const totalSeconds = () => store().pendingSessions.reduce((sum, s) => sum + s.actualDurationSeconds, 0)

/** The page's script dies with it; a new page reads the saved state from storage. */
async function reopenPageAfter(ms: number) {
    await act(async () => {
        vi.advanceTimersByTime(ms)
        await useTimerStore.persist.rehydrate()
    })
    render(<TimerRunner />)
}

function startThirtyMinuteFocus() {
    store().updateSettings({ focusDuration: 30, soundEnabled: false })
    store().start()
    render(<TimerRunner />)
}

beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-06T12:00:00-03:00'))
    vi.stubGlobal('Worker', TimerWorker)
    localStorage.clear()
    useTimerStore.setState({ ...initialState, settings: DEFAULT_SETTINGS })
})

afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.useRealTimers()
})

describe('closing the page during a Pomodoro', () => {
    // Listeners must stay attached for the close, so close before unmounting here.
    const closeKeepingListeners = () => window.dispatchEvent(new Event('pagehide'))

    it('saves the time studied at the moment of closing, before anything reopens', () => {
        startThirtyMinuteFocus()
        vi.advanceTimersByTime(15 * MINUTE)
        closeKeepingListeners()

        expect(totalSeconds()).toBe(15 * 60)
        expect(store().pendingSessions[0].completed).toBe(false)
    })

    it('writes it to storage synchronously, since the page may die right after', () => {
        startThirtyMinuteFocus()
        vi.advanceTimersByTime(15 * MINUTE)
        closeKeepingListeners()

        const saved = JSON.parse(localStorage.getItem('pomodoro-timer-storage')!).state
        expect(saved.pendingSessions[0].actualDurationSeconds).toBe(15 * 60)
        expect(saved.recordedSeconds).toBe(15 * 60)
        expect(saved.closedAt).toBe(Date.now())
    })

    it('ends the session at the close when the user stays away, not counting the time away', async () => {
        startThirtyMinuteFocus()
        vi.advanceTimersByTime(15 * MINUTE)
        closeKeepingListeners()
        cleanup()
        await reopenPageAfter(2 * 60 * MINUTE)

        expect(totalSeconds()).toBe(15 * 60)
        expect(store().pendingSessions).toHaveLength(1)
        expect(store().status).toBe('idle')
        expect(store().mode).toBe('focus')
        expect(store().secondsRemaining).toBe(30 * 60)
        // It did not finish, so it is not a Pomodoro.
        expect(store().completedPomodoros).toBe(0)
    })

    it('resumes after a reload and never counts the same minutes twice', async () => {
        startThirtyMinuteFocus()
        vi.advanceTimersByTime(15 * MINUTE)
        closeKeepingListeners()
        cleanup()
        await reopenPageAfter(5000)

        expect(store().status).toBe('running')
        expect(store().closedAt).toBeNull()

        act(() => vi.advanceTimersByTime(15 * MINUTE - 5000))
        act(() => document.dispatchEvent(new Event('visibilitychange')))

        expect(store().mode).toBe('shortBreak')
        expect(totalSeconds()).toBe(30 * 60)
        expect(store().pendingSessions.map((s) => s.completed)).toEqual([false, true])
        expect(store().completedPomodoros).toBe(1)
    })

    it('counts a Pomodoro split by a reload as one session of the day', async () => {
        startThirtyMinuteFocus()
        vi.advanceTimersByTime(15 * MINUTE)
        closeKeepingListeners()
        cleanup()
        await reopenPageAfter(5000)
        act(() => vi.advanceTimersByTime(15 * MINUTE))
        act(() => document.dispatchEvent(new Event('visibilitychange')))

        const [day] = buildDayStats(store().pendingSessions)
        expect(day.sessionCount).toBe(1)
        expect(day.totalMinutes).toBe(30)
    })

    it('still ends at the close when the countdown would have run out while away', async () => {
        startThirtyMinuteFocus()
        vi.advanceTimersByTime(29 * MINUTE)
        closeKeepingListeners()
        cleanup()
        await reopenPageAfter(CLOSED_PAGE_GRACE_MS + 1)

        expect(totalSeconds()).toBe(29 * 60)
        expect(store().status).toBe('idle')
        expect(store().mode).toBe('focus')
    })

    it('does not save less than a minute, like any other partial session', async () => {
        startThirtyMinuteFocus()
        vi.advanceTimersByTime(30000)
        closeKeepingListeners()
        cleanup()
        await reopenPageAfter(CLOSED_PAGE_GRACE_MS + 1)

        expect(store().pendingSessions).toHaveLength(0)
        expect(store().status).toBe('idle')
    })

    it('adds the short stretch after a reload when the user then leaves for good', async () => {
        startThirtyMinuteFocus()
        vi.advanceTimersByTime(15 * MINUTE)
        closeKeepingListeners()
        cleanup()
        await reopenPageAfter(1000)
        act(() => vi.advanceTimersByTime(20000))
        closeKeepingListeners()
        cleanup()
        await reopenPageAfter(CLOSED_PAGE_GRACE_MS + 1)

        // 15 min + the 1 s reload gap + 20 s
        expect(totalSeconds()).toBe(15 * 60 + 21)
        expect(store().status).toBe('idle')
    })

    it('keeps hyperfocus overtime only up to the close and finishes the Pomodoro', async () => {
        store().toggleHyperfocus()
        startThirtyMinuteFocus()
        act(() => {
            vi.advanceTimersByTime(30 * MINUTE)
            window.dispatchEvent(new Event('focus'))
        })
        expect(store().status).toBe('hyperfocus')
        act(() => {
            vi.advanceTimersByTime(10 * MINUTE)
            window.dispatchEvent(new Event('focus'))
        })
        closeKeepingListeners()
        cleanup()
        await reopenPageAfter(5 * 60 * MINUTE)

        expect(totalSeconds()).toBe(40 * 60)
        expect(store().pendingSessions[0].hyperfocusSeconds).toBe(10 * 60)
        expect(store().pendingSessions[0].completed).toBe(true)
        expect(store().completedPomodoros).toBe(1)
        expect(store().status).toBe('idle')
    })

    it('keeps a paused session paused, with its time already saved', async () => {
        startThirtyMinuteFocus()
        vi.advanceTimersByTime(15 * MINUTE)
        act(() => store().pause())
        closeKeepingListeners()
        cleanup()
        await reopenPageAfter(24 * 60 * MINUTE)

        expect(store().status).toBe('paused')
        expect(store().secondsRemaining).toBe(15 * 60)
        expect(totalSeconds()).toBe(15 * 60)

        act(() => store().reset())
        expect(totalSeconds()).toBe(15 * 60)
    })

    it('does not end a session that another open tab is still showing', async () => {
        startThirtyMinuteFocus()
        vi.advanceTimersByTime(15 * MINUTE)
        // Another tab closes: it wrote the mark to storage; this one reacts.
        store().markPageClosed()
        expect(store().closedAt).not.toBeNull()
        await act(async () => {
            window.dispatchEvent(new StorageEvent('storage', { key: 'pomodoro-timer-storage' }))
            await vi.advanceTimersByTimeAsync(0)
        })
        expect(store().closedAt).toBeNull()
        expect(store().status).toBe('running')

        act(() => vi.advanceTimersByTime(CLOSED_PAGE_GRACE_MS * 2))
        act(() => store().settleClosedPage())
        expect(store().status).toBe('running')
    })

    it('ignores closing the page when no session is open', () => {
        store().updateSettings({ soundEnabled: false })
        render(<TimerRunner />)
        closeKeepingListeners()

        expect(store().closedAt).toBeNull()
        expect(store().pendingSessions).toHaveLength(0)
    })
})

describe('a page killed without warning (phones)', () => {
    it('keeps counting, because the user may be studying with the screen locked', async () => {
        startThirtyMinuteFocus()
        cleanup() // no pagehide event
        await reopenPageAfter(30 * MINUTE)

        expect(totalSeconds()).toBe(30 * 60)
        expect(store().pendingSessions[0].completed).toBe(true)
    })
})

describe('closing during a break', () => {
    it('goes back to an idle focus when the user stays away', async () => {
        store().updateSettings({ soundEnabled: false })
        store().setMode('shortBreak')
        store().start()
        render(<TimerRunner />)
        vi.advanceTimersByTime(MINUTE)
        window.dispatchEvent(new Event('pagehide'))
        cleanup()
        await reopenPageAfter(60 * MINUTE)

        expect(store().mode).toBe('focus')
        expect(store().status).toBe('idle')
        expect(store().pendingSessions).toHaveLength(0)
    })
})
