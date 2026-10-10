'use client'

import { useEffect, useCallback, useState } from 'react'
import { useTimer } from '@/hooks/useTimer'
import { ModeSelector } from './ModeSelector'
import { TimerDisplay } from './TimerDisplay'
import { TimerControls } from './TimerControls'
import { HyperfocusIdleWarning } from './HyperfocusIdleWarning'
import { BarChart3, Hourglass } from 'lucide-react'
import Link from 'next/link'

export function Timer() {
    const {
        mode,
        status,
        settings,
        completedPomodoros,
        hyperfocusEnabled,
        formattedTime,
        accentColor,
        modeLabel,
        givingUpLocked,
        start,
        pause,
        reset,
        skip,
        toggleHyperfocus,
    } = useTimer()

    // With "No giving up" there is no way out once a focus starts, so starting
    // one takes a second click (or Space press) within a few seconds.
    const needsConfirm = settings.noGiveUp && mode === 'focus' && status === 'idle'
    const [confirmRequested, setConfirmRequested] = useState(false)
    const confirmingStart = confirmRequested && needsConfirm

    useEffect(() => {
        if (!confirmRequested) return
        const id = window.setTimeout(() => setConfirmRequested(false), 3000)
        return () => window.clearTimeout(id)
    }, [confirmRequested])

    const requestStart = useCallback(() => {
        if (needsConfirm && !confirmRequested) {
            setConfirmRequested(true)
            return
        }
        setConfirmRequested(false)
        start()
    }, [needsConfirm, confirmRequested, start])

    // Spacebar shortcut: start / pause
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.code !== 'Space') return
            const tag = (e.target as HTMLElement)?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
            e.preventDefault()
            if (status === 'running' || status === 'hyperfocus') {
                pause()
            } else {
                requestStart()
            }
        },
        [status, requestStart, pause],
    )

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])

    const pomodoroText = completedPomodoros === 1 ? 'Pomodoro' : 'Pomodoros'

    return (
        <div className="min-h-screen bg-[#1A1B24] flex flex-col items-center pt-8 px-4 animate-in fade-in slide-in-from-bottom-1 duration-500 ease-[var(--ease-apple)]">
            {/* Header */}
            <header className="w-full max-w-md flex items-center justify-between mb-8">
                <h1
                    className="text-2xl font-bold text-white italic tracking-tight transition-colors duration-500 ease-[var(--ease-apple)]"
                    style={{ color: accentColor }}
                >
                    PomoLock
                </h1>
            </header>

            {/* Mode selector */}
            <div className="w-full max-w-md mb-6">
                <ModeSelector accentColor={accentColor} locked={givingUpLocked} />
            </div>

            {/* Pomodoro counter + Stats */}
            <div className="w-full max-w-md flex items-center justify-between mb-10 px-1">
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                    <Hourglass className="h-4 w-4 transition-colors duration-500 ease-[var(--ease-apple)]" style={{ color: accentColor }} />
                    <span className="font-medium tabular-nums">
                        {completedPomodoros} {pomodoroText}
                    </span>
                </div>
                <Link
                    href="/dashboard"
                    className="flex items-center gap-1.5 text-zinc-400 text-sm hover:text-zinc-300 transition-colors"
                >
                    <BarChart3 className="h-4 w-4" />
                    Stats
                </Link>
            </div>

            <HyperfocusIdleWarning accentColor={accentColor} />

            {/* Circular timer */}
            <div className="mb-10">
                <TimerDisplay
                    formattedTime={formattedTime}
                    modeLabel={modeLabel}
                    accentColor={accentColor}
                    isRunning={status === 'running' || status === 'hyperfocus'}
                    canReset={!givingUpLocked}
                    onReset={reset}
                />
            </div>

            {/* Controls */}
            <TimerControls
                status={status}
                hyperfocusEnabled={hyperfocusEnabled}
                accentColor={accentColor}
                canSkip={!givingUpLocked}
                confirmingStart={confirmingStart}
                onStart={requestStart}
                onPause={pause}
                onSkip={skip}
                onToggleHyperfocus={toggleHyperfocus}
            />
        </div>
    )
}
