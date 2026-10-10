import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Timer } from '@/components/timer/Timer'
import { remainingFraction } from '@/components/timer/ProgressRing'
import { useTimerStore } from '@/stores/timerStore'
import { DEFAULT_SETTINGS } from '@/types'

const initialState = useTimerStore.getInitialState()
const store = () => useTimerStore.getState()
const MINUTE = 60000

beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-10T12:00:00-03:00'))
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    useTimerStore.setState({ ...initialState, settings: { ...DEFAULT_SETTINGS, noGiveUp: true } })
})

afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.useRealTimers()
})

describe('no giving up', () => {
    it('ignores skip, reset and mode switches during the focus countdown', () => {
        store().start()
        vi.advanceTimersByTime(5 * MINUTE)
        store().skip()
        store().reset()
        store().setMode('shortBreak')

        expect(store().status).toBe('running')
        expect(store().mode).toBe('focus')
        expect(store().pendingSessions).toHaveLength(0)
    })

    it('stays locked while paused, but pausing is allowed', () => {
        store().start()
        store().pause()
        store().reset()
        expect(store().status).toBe('paused')
    })

    it('lets hyperfocus end, since the Pomodoro already finished', () => {
        store().toggleHyperfocus()
        store().start()
        vi.advanceTimersByTime(25 * MINUTE)
        store().tick()
        store().enterHyperfocus()
        vi.advanceTimersByTime(10 * MINUTE)
        store().skip()

        expect(store().mode).toBe('shortBreak')
        expect(store().pendingSessions[0].actualDurationSeconds).toBe(35 * 60)
    })

    it('gives every way out back when turned off mid-session', () => {
        store().start()
        vi.advanceTimersByTime(5 * MINUTE)
        store().updateSettings({ noGiveUp: false })
        store().reset()

        expect(store().status).toBe('idle')
        expect(store().pendingSessions[0].actualDurationSeconds).toBe(5 * 60)
    })

    it('does not affect breaks', () => {
        store().setMode('shortBreak')
        store().start()
        store().skip()
        expect(store().mode).toBe('focus')
    })

    it('needs a second click to start, and hides the ways out once running', () => {
        render(<Timer />)
        const start = screen.getByRole('button', { name: 'Start' })

        fireEvent.click(start)
        expect(store().status).toBe('idle')
        expect(screen.getByText('No giving up is on. Click again to start.')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Click again to start' }))
        expect(store().status).toBe('running')
        expect(screen.getByLabelText('Skip', { selector: 'button' })).toBeDisabled()
        expect(screen.getByLabelText('Reset', { selector: 'button' })).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Short Break', hidden: true })).toBeDisabled()
    })

    it('forgets the first click after a few seconds', () => {
        render(<Timer />)
        fireEvent.click(screen.getByRole('button', { name: 'Start' }))
        act(() => vi.advanceTimersByTime(3000))
        fireEvent.click(screen.getByRole('button', { name: 'Start' }))
        expect(store().status).toBe('idle')
    })
})

describe('session settings lock', () => {
    it('keeps the running phase length and applies new durations to the next phase', () => {
        store().start()
        vi.advanceTimersByTime(5 * MINUTE)
        store().updateSettings({ focusDuration: 50 })
        store().tick()
        expect(store().secondsRemaining).toBe(20 * 60)
    })
})

describe('progress ring', () => {
    it('follows the clock between whole seconds', () => {
        store().start()
        const startedAt = Date.now()
        expect(remainingFraction(store(), startedAt + 12.5 * MINUTE, false)).toBeCloseTo(0.5)
        expect(remainingFraction(store(), startedAt + 500, true)).toBe(1)
    })

    it('is full when idle and during hyperfocus', () => {
        expect(remainingFraction(store(), Date.now(), false)).toBe(1)
        store().enterHyperfocus()
        expect(remainingFraction(store(), Date.now() + MINUTE, false)).toBe(1)
    })

    it('uses the length the phase started with', () => {
        useTimerStore.setState({ settings: { ...store().settings, noGiveUp: false } })
        store().start()
        vi.advanceTimersByTime(5 * MINUTE)
        store().pause()
        store().updateSettings({ focusDuration: 50 })
        expect(remainingFraction(store(), Date.now(), false)).toBeCloseTo(0.8)
    })
})
