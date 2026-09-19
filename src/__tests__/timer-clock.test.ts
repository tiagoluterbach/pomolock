import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTimerStore } from '@/stores/timerStore'
import { DEFAULT_SETTINGS } from '@/types'

const initialState = useTimerStore.getInitialState()

beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-19T12:00:00Z'))
    useTimerStore.setState({ ...initialState, settings: DEFAULT_SETTINGS })
    useTimerStore.getState().updateSettings({ focusDuration: 60 })
})

afterEach(() => vi.useRealTimers())

describe('elapsed-time clock', () => {
    it('does not run faster when duplicate or early ticks arrive', () => {
        useTimerStore.getState().start()
        vi.advanceTimersByTime(1000)
        for (let i = 0; i < 20; i++) useTimerStore.getState().tick()
        expect(useTimerStore.getState().secondsRemaining).toBe(3599)
    })

    it('measures one hour even without intermediate ticks', () => {
        useTimerStore.getState().start()
        vi.advanceTimersByTime(3599999)
        useTimerStore.getState().tick()
        expect(useTimerStore.getState().secondsRemaining).toBe(1)
        vi.advanceTimersByTime(1)
        useTimerStore.getState().tick()
        expect(useTimerStore.getState().secondsRemaining).toBe(0)
    })

    it('excludes paused time and preserves fractions across repeated pauses', () => {
        useTimerStore.getState().start()
        for (let i = 0; i < 4; i++) {
            vi.advanceTimersByTime(250)
            useTimerStore.getState().pause()
            vi.advanceTimersByTime(60000)
            useTimerStore.getState().tick()
            useTimerStore.getState().start()
        }
        expect(useTimerStore.getState().secondsRemaining).toBe(3599)
    })

    it('recovers elapsed time after rehydration across midnight', async () => {
        vi.setSystemTime(new Date('2026-09-19T23:59:00-03:00'))
        useTimerStore.getState().start()
        vi.advanceTimersByTime(120000)
        await useTimerStore.persist.rehydrate()
        useTimerStore.getState().tick()
        expect(useTimerStore.getState().status).toBe('running')
        expect(useTimerStore.getState().secondsRemaining).toBe(3480)
    })

    it('keeps a rehydrated paused timer frozen', async () => {
        useTimerStore.getState().start()
        vi.advanceTimersByTime(1250)
        useTimerStore.getState().pause()
        vi.advanceTimersByTime(3600000)
        await useTimerStore.persist.rehydrate()
        useTimerStore.getState().start()
        vi.advanceTimersByTime(750)
        useTimerStore.getState().tick()
        expect(useTimerStore.getState().secondsRemaining).toBe(3598)
    })

    it('includes overdue time in hyperfocus and excludes its pauses', () => {
        useTimerStore.getState().start()
        vi.advanceTimersByTime(3605250)
        useTimerStore.getState().tick()
        useTimerStore.getState().enterHyperfocus()
        expect(useTimerStore.getState().hyperfocusSeconds).toBe(5)
        useTimerStore.getState().pause()
        vi.advanceTimersByTime(60000)
        useTimerStore.getState().start()
        vi.advanceTimersByTime(750)
        for (let i = 0; i < 10; i++) useTimerStore.getState().tickHyperfocus()
        expect(useTimerStore.getState().hyperfocusSeconds).toBe(6)
    })

    it('saves actual progress on reset without waiting for a tick', () => {
        useTimerStore.getState().start()
        vi.advanceTimersByTime(120000)
        useTimerStore.getState().reset()
        expect(useTimerStore.getState().pendingSessions[0].actualDurationSeconds).toBe(120)
    })

    it('resumes an old saved timer from its last known remaining time', async () => {
        localStorage.setItem('pomodoro-timer-storage', JSON.stringify({
            version: 0,
            state: {
                status: 'running', mode: 'focus', secondsRemaining: 1800,
                sessionStartedAt: new Date(Date.now() - 2400000).toISOString(),
            },
        }))
        await useTimerStore.persist.rehydrate()
        expect(useTimerStore.getState().secondsRemaining).toBe(1800)
        vi.advanceTimersByTime(1000)
        useTimerStore.getState().tick()
        expect(useTimerStore.getState().secondsRemaining).toBe(1799)
    })

    it('recovers an already active hyperfocus after reload', async () => {
        useTimerStore.getState().enterHyperfocus()
        vi.advanceTimersByTime(90250)
        await useTimerStore.persist.rehydrate()
        expect(useTimerStore.getState().hyperfocusSeconds).toBe(90)
        vi.advanceTimersByTime(750)
        useTimerStore.getState().tick()
        expect(useTimerStore.getState().hyperfocusSeconds).toBe(91)
    })

    it('preserves elapsed fractions when changing the duration while paused', () => {
        useTimerStore.getState().start()
        vi.advanceTimersByTime(1250)
        useTimerStore.getState().pause()
        useTimerStore.getState().updateSettings({ focusDuration: 30 })
        useTimerStore.getState().start()
        vi.advanceTimersByTime(750)
        useTimerStore.getState().tick()
        expect(useTimerStore.getState().secondsRemaining).toBe(1798)
    })

    it('clears the old deadline when resetting and starting a new session', () => {
        useTimerStore.getState().start()
        vi.advanceTimersByTime(120000)
        useTimerStore.getState().reset()
        vi.advanceTimersByTime(60000)
        useTimerStore.getState().start()
        useTimerStore.getState().tick()
        expect(useTimerStore.getState().secondsRemaining).toBe(3600)
    })
})
