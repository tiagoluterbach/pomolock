'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { TimerMode } from '@/types'
import { ProgressRing } from './ProgressRing'

interface TimerDisplayProps {
    mode: TimerMode
    formattedTime: string
    modeLabel: string
    accentColor: string
    isRunning: boolean
    canReset: boolean
    onReset: () => void
}

export function TimerDisplay({
    mode,
    formattedTime,
    modeLabel,
    accentColor,
    isRunning,
    canReset,
    onReset,
}: TimerDisplayProps) {
    // Each phase change (a Pomodoro ending, a break starting) gets a soft beat
    // on the ring and a fresh entrance for the time. Not on the first render.
    const [handover, setHandover] = useState({ mode, count: 0 })
    if (handover.mode !== mode) setHandover({ mode, count: handover.count + 1 })
    const animate = handover.count > 0

    return (
        <div className="relative flex items-center justify-center">
            <div
                key={handover.count}
                style={animate ? { animation: 'ring-pulse 600ms var(--ease-apple)' } : undefined}
            >
                <ProgressRing color={accentColor} />
            </div>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <span
                    key={handover.count}
                    className={cn(
                        'text-5xl sm:text-6xl font-bold text-white tabular-nums tracking-tight',
                        animate && 'animate-in fade-in zoom-in-90 duration-500 ease-[var(--ease-apple)]',
                    )}
                    style={{ fontFamily: 'var(--font-rubik)' }}
                >
                    {formattedTime}
                </span>
                <span
                    className="text-sm font-medium tabular-nums transition-colors duration-500 ease-[var(--ease-apple)]"
                    style={{ color: isRunning ? accentColor : 'rgba(161,161,170,1)' }}
                >
                    {modeLabel}
                </span>
                {/* Reset icon (hidden while giving up is locked) */}
                <button
                    onClick={onReset}
                    disabled={!canReset}
                    className="mt-1 text-zinc-500 hover:text-zinc-300 transition-[color,opacity] duration-300 ease-[var(--ease-apple)] active:scale-90 disabled:opacity-0 disabled:pointer-events-none"
                    aria-label="Reset"
                    aria-hidden={!canReset}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                        <path d="M21 21v-5h-5" />
                    </svg>
                </button>
            </div>
        </div>
    )
}
