'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useTimerStore, HYPERFOCUS_IDLE_WARNING_MS, HYPERFOCUS_IDLE_GRACE_MS } from '@/stores/timerStore'
import { formatClock } from '@/lib/utils'
import { ALARM_FILES, type AppSettings } from '@/types'

// Request notification permission on first load
function requestNotificationPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
    }
}

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'focus'] as const
// Activity only needs minute precision; avoid rewriting storage on every keystroke.
const ACTIVITY_THROTTLE_MS = 15000

function showTimerNotification(mode: string) {
    showNotification(
        mode === 'focus' ? '⏰ Pomodoro finished!' : '☕ Break is over!',
        mode === 'focus' ? 'Time for a break!' : 'Time to focus!',
    )
}

function showNotification(title: string, body: string) {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return

    try {
        const notification = new Notification(title, {
            body,
            icon: '/icon-192.png',
            tag: 'pomolock-timer', // Replaces previous notification
            requireInteraction: true, // Stays until user clicks
        })

        notification.onclick = () => {
            window.focus()
            notification.close()
        }
    } catch {
        // Fallback: some browsers don't support Notification constructor in this context
    }
}

export function TimerRunner() {
    const status = useTimerStore((s) => s.status)
    const mode = useTimerStore((s) => s.mode)
    const secondsRemaining = useTimerStore((s) => s.secondsRemaining)
    const hyperfocusSeconds = useTimerStore((s) => s.hyperfocusSeconds)
    const clock = useTimerStore((s) => s.clock)

    // Settings
    const showTimerInTitle = useTimerStore((s) => s.settings.showTimerInTitle ?? true)

    const audioRef = useRef<HTMLAudioElement | null>(null)
    const alarmCancelledRef = useRef(false)
    // Web Audio API context + pre-decoded buffers for background-tab playback
    const audioCtxRef = useRef<AudioContext | null>(null)
    const audioBuffersRef = useRef<Record<string, AudioBuffer>>({})
    const keepAliveRef = useRef<number | null>(null)

    // Request notification permission on mount
    useEffect(() => {
        requestNotificationPermission()
    }, [])

    // Initialize AudioContext on first user interaction & pre-fetch audio buffers
    useEffect(() => {
        const initAudioContext = async () => {
            if (audioCtxRef.current) return
            const ctx = new AudioContext()
            audioCtxRef.current = ctx

            // Pre-fetch and decode audio files
            for (const file of Object.values(ALARM_FILES)) {
                try {
                    const response = await fetch(file)
                    const arrayBuffer = await response.arrayBuffer()
                    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
                    audioBuffersRef.current[file] = audioBuffer
                } catch { /* silently ignore if fetch fails */ }
            }
        }

        // Initialize on first click/keypress (required by browsers)
        const handler = () => {
            initAudioContext()
            window.removeEventListener('click', handler)
            window.removeEventListener('keydown', handler)
        }
        window.addEventListener('click', handler)
        window.addEventListener('keydown', handler)

        return () => {
            window.removeEventListener('click', handler)
            window.removeEventListener('keydown', handler)
        }
    }, [])

    // Keep AudioContext alive when timer is running (prevents browser suspension)
    useEffect(() => {
        if ((status === 'running' || status === 'hyperfocus') && audioCtxRef.current) {
            // Play a silent pulse every 25s to keep AudioContext active
            const ping = () => {
                const ctx = audioCtxRef.current
                if (!ctx || ctx.state === 'closed') return
                if (ctx.state === 'suspended') ctx.resume()
                const osc = ctx.createOscillator()
                const gain = ctx.createGain()
                gain.gain.value = 0 // silent
                osc.connect(gain)
                gain.connect(ctx.destination)
                osc.start()
                osc.stop(ctx.currentTime + 0.01)
            }
            ping()
            keepAliveRef.current = window.setInterval(ping, 25000)
            return () => {
                if (keepAliveRef.current) clearInterval(keepAliveRef.current)
            }
        } else {
            if (keepAliveRef.current) {
                clearInterval(keepAliveRef.current)
                keepAliveRef.current = null
            }
        }
    }, [status])

    // Helper to play alarm sound (Web Audio API — works in background tabs)
    const playAlarm = useCallback((settings: Pick<AppSettings, 'alarmSound' | 'soundVolume' | 'alarmRepeatCount'>) => {
        try {
            const repeat = settings.alarmRepeatCount || 3
            const soundFile = ALARM_FILES[settings.alarmSound] ?? ALARM_FILES.bip
            alarmCancelledRef.current = false

            const ctx = audioCtxRef.current
            const buffer = audioBuffersRef.current[soundFile]

            // Fallback to HTML Audio if Web Audio API isn't available
            if (!ctx || !buffer) {
                const playOnce = (index: number) => {
                    if (index >= repeat || alarmCancelledRef.current) return
                    const audio = new Audio(soundFile)
                    audio.volume = settings.soundVolume
                    audioRef.current = audio
                    audio.play().catch(() => {})
                    audio.onended = () => {
                        audioRef.current = null
                        playOnce(index + 1)
                    }
                }
                playOnce(0)
                return
            }

            // Resume context if suspended
            if (ctx.state === 'suspended') ctx.resume()

            const playOnce = (index: number) => {
                if (index >= repeat || alarmCancelledRef.current) return
                const source = ctx.createBufferSource()
                const gainNode = ctx.createGain()
                source.buffer = buffer
                gainNode.gain.value = settings.soundVolume
                source.connect(gainNode)
                gainNode.connect(ctx.destination)
                source.onended = () => playOnce(index + 1)
                source.start()
            }
            playOnce(0)
        } catch (e) {
            console.error("Audio playback failed", e)
        }
    }, [])

    // Helper to stop alarm
    const stopAlarm = useCallback(() => {
        if (audioRef.current) {
            try {
                audioRef.current.pause()
                audioRef.current.currentTime = 0
            } catch { /* ignore */ }
            audioRef.current = null
        }
        alarmCancelledRef.current = true
    }, [])

    // Listen for explicit "stop alarm" from UI components (e.g. ModeSelector)
    useEffect(() => {
        const handler = () => stopAlarm()
        window.addEventListener('pomodoro-stop-alarm', handler)
        return () => window.removeEventListener('pomodoro-stop-alarm', handler)
    }, [stopAlarm])

    // Preserve alarm cancellation when the user resumes or starts a timer.
    useEffect(() => {
        if (status === 'running' || status === 'hyperfocus') stopAlarm()
    }, [status, stopAlarm])

    // Other tabs write the same storage key; adopt their state so tabs never
    // overwrite each other's sessions or finish the same phase twice.
    useEffect(() => {
        const handler = (event: StorageEvent) => {
            if (event.key === useTimerStore.persist.getOptions().name) {
                useTimerStore.persist.rehydrate()
            }
        }
        window.addEventListener('storage', handler)
        return () => window.removeEventListener('storage', handler)
    }, [])

    // Record interaction while a session is open; hyperfocus overtime relies on it.
    useEffect(() => {
        if (status === 'idle') return

        const handler = () => {
            const { lastActivityAt, markActivity } = useTimerStore.getState()
            if (lastActivityAt !== null && Date.now() - lastActivityAt < ACTIVITY_THROTTLE_MS) return
            markActivity()
        }
        const onVisible = () => {
            if (document.visibilityState === 'visible') handler()
        }
        for (const type of ACTIVITY_EVENTS) window.addEventListener(type, handler, { passive: true })
        document.addEventListener('visibilitychange', onVisible)
        return () => {
            for (const type of ACTIVITY_EVENTS) window.removeEventListener(type, handler)
            document.removeEventListener('visibilitychange', onVisible)
        }
    }, [status])

    // Ask once per quiet stretch whether the user is still there.
    const warnedForRef = useRef<number | null>(null)

    // Worker messages are wake-ups, never seconds. Reconcile immediately on
    // resume/reload, and use one completion path for foreground and background.
    useEffect(() => {
        if (status !== 'running' && status !== 'hyperfocus') return

        const refresh = () => {
            const before = useTimerStore.getState()
            // Ignore queued messages from a previous phase or paused interval.
            if (before.clock !== clock || before.status !== status || before.mode !== mode) return
            before.tick()
            const state = useTimerStore.getState()

            if (before.status === 'hyperfocus' && state.status === 'paused') {
                showNotification('🧠 Hyperfocus paused', 'No activity for a while. Time after the warning was not counted.')
                return
            }
            if (
                state.status === 'hyperfocus' &&
                state.lastActivityAt !== null &&
                Date.now() - state.lastActivityAt >= HYPERFOCUS_IDLE_WARNING_MS &&
                warnedForRef.current !== state.lastActivityAt
            ) {
                warnedForRef.current = state.lastActivityAt
                showNotification(
                    '🧠 Still studying?',
                    `Hyperfocus pauses in ${HYPERFOCUS_IDLE_GRACE_MS / 60000} minutes without activity.`,
                )
                if (state.settings.soundEnabled) playAlarm({ ...state.settings, alarmRepeatCount: 1 })
            }

            if (state.status !== 'running' || state.secondsRemaining > 0) return

            const { settings, hyperfocusEnabled } = state
            // Transition synchronously so another wake-up cannot complete twice.
            if (state.mode === 'focus' && hyperfocusEnabled) {
                state.enterHyperfocus()
            } else {
                state.complete()
            }
            if (!document.hasFocus()) showTimerNotification(state.mode)
            if (settings.soundEnabled && !(state.mode === 'focus' && hyperfocusEnabled)) {
                playAlarm(settings)
            }
        }

        let worker: Worker | null = null
        let fallback: number | undefined
        const startFallback = () => {
            worker?.terminate()
            worker = null
            if (fallback === undefined) fallback = window.setInterval(refresh, 1000)
        }
        try {
            worker = new Worker('/timerWorker.js')
            worker.onmessage = (event) => {
                if (event.data.type === 'tick') refresh()
            }
            worker.onerror = startFallback
            worker.postMessage({ type: 'start' })
        } catch {
            startFallback()
        }

        window.addEventListener('focus', refresh)
        window.addEventListener('pageshow', refresh)
        document.addEventListener('visibilitychange', refresh)
        refresh()
        return () => {
            worker?.terminate()
            if (fallback !== undefined) window.clearInterval(fallback)
            window.removeEventListener('focus', refresh)
            window.removeEventListener('pageshow', refresh)
            document.removeEventListener('visibilitychange', refresh)
        }
    }, [status, mode, clock, playAlarm])

    // Update Page Title
    useEffect(() => {
        if (!showTimerInTitle) {
            document.title = 'PomoLock'
            return
        }

        let title = 'PomoLock'
        if (status === 'running' || status === 'paused') {
            title = `(${formatClock(secondsRemaining)}) ${mode === 'focus' ? 'PomoLock' : 'Break'}`
        } else if (status === 'hyperfocus') {
            title = `(Hyper: ${formatClock(hyperfocusSeconds)}) PomoLock`
        }

        document.title = title
    }, [secondsRemaining, hyperfocusSeconds, status, mode, showTimerInTitle])

    return null
}
