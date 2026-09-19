import { StrictMode } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TimerRunner } from '@/components/timer/TimerRunner'
import { useTimerStore } from '@/stores/timerStore'

class TimerWorker {
    static instances: TimerWorker[] = []
    onmessage: ((event: { data: { type: string } }) => void) | null = null
    onerror: (() => void) | null = null
    postMessage = vi.fn()
    terminate = vi.fn()
    constructor() { TimerWorker.instances.push(this) }
    tick() { this.onmessage?.({ data: { type: 'tick' } }) }
}

beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-19T12:00:00Z'))
    vi.stubGlobal('Worker', TimerWorker)
    TimerWorker.instances = []
    useTimerStore.setState(useTimerStore.getInitialState())
    useTimerStore.getState().updateSettings({ focusDuration: 60, soundEnabled: false })
})

afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.useRealTimers()
})

describe('timer wake-ups and completion', () => {
    it('finishes exactly once after one hour, including duplicate and stale messages', () => {
        useTimerStore.getState().start()
        render(<StrictMode><TimerRunner /></StrictMode>)
        const worker = TimerWorker.instances.at(-1)!
        act(() => {
            vi.advanceTimersByTime(3599999)
            worker.tick()
            worker.tick()
        })
        expect(useTimerStore.getState().secondsRemaining).toBe(1)
        expect(useTimerStore.getState().pendingSessions).toHaveLength(0)
        act(() => {
            vi.advanceTimersByTime(1)
            for (const instance of TimerWorker.instances) instance.tick()
            worker.tick()
        })
        expect(useTimerStore.getState().mode).toBe('shortBreak')
        expect(useTimerStore.getState().pendingSessions).toHaveLength(1)
        expect(useTimerStore.getState().pendingSessions[0].actualDurationSeconds).toBe(3600)
        expect(worker.terminate).toHaveBeenCalled()
    })

    it('starts a fresh clock for auto-start breaks and the following focus', () => {
        useTimerStore.getState().updateSettings({ autoStartBreaks: true, autoStartPomodoros: true })
        useTimerStore.getState().start()
        render(<TimerRunner />)
        const focusWorker = TimerWorker.instances.at(-1)!
        act(() => {
            vi.advanceTimersByTime(3600000)
            focusWorker.tick()
        })
        expect(useTimerStore.getState().mode).toBe('shortBreak')
        expect(useTimerStore.getState().status).toBe('running')
        act(() => {
            vi.advanceTimersByTime(300000)
            focusWorker.tick() // queued message from the old phase
        })
        expect(useTimerStore.getState().mode).toBe('shortBreak')
        act(() => TimerWorker.instances.at(-1)!.tick())
        expect(useTimerStore.getState().mode).toBe('focus')
        expect(useTimerStore.getState().secondsRemaining).toBe(3600)
        expect(useTimerStore.getState().pendingSessions).toHaveLength(1)
    })

    it('recovers an expired session on mount without fabricating missed cycles', () => {
        useTimerStore.getState().updateSettings({ autoStartBreaks: true })
        useTimerStore.getState().start()
        vi.advanceTimersByTime(3 * 3600000)
        render(<StrictMode><TimerRunner /></StrictMode>)
        expect(useTimerStore.getState().pendingSessions).toHaveLength(1)
        expect(useTimerStore.getState().mode).toBe('shortBreak')
        expect(useTimerStore.getState().secondsRemaining).toBe(300)
    })

    it('recovers hyperfocus overtime on returning to the page', () => {
        useTimerStore.getState().toggleHyperfocus()
        useTimerStore.getState().start()
        render(<TimerRunner />)
        act(() => {
            vi.advanceTimersByTime(3660000)
            document.dispatchEvent(new Event('visibilitychange'))
            window.dispatchEvent(new Event('focus'))
        })
        expect(useTimerStore.getState().status).toBe('hyperfocus')
        expect(useTimerStore.getState().hyperfocusSeconds).toBe(60)
        expect(useTimerStore.getState().pendingSessions).toHaveLength(0)
    })

    it('keeps measuring time when workers are unavailable', () => {
        vi.stubGlobal('Worker', undefined)
        useTimerStore.getState().start()
        render(<TimerRunner />)
        act(() => vi.advanceTimersByTime(2000))
        expect(useTimerStore.getState().secondsRemaining).toBe(3598)
    })
})
