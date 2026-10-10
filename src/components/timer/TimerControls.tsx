'use client'

import { Play, Pause, SkipForward, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TimerStatus } from '@/types'

interface TimerControlsProps {
    status: TimerStatus
    hyperfocusEnabled: boolean
    accentColor: string
    canSkip: boolean
    confirmingStart: boolean
    onStart: () => void
    onPause: () => void
    onSkip: () => void
    onToggleHyperfocus: () => void
}

export function TimerControls({
    status,
    hyperfocusEnabled,
    accentColor,
    canSkip,
    confirmingStart,
    onStart,
    onPause,
    onSkip,
    onToggleHyperfocus,
}: TimerControlsProps) {
    const isActive = status === 'running' || status === 'hyperfocus'

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center gap-5">
                {/* Hyperfocus toggle */}
                <button
                    onClick={onToggleHyperfocus}
                    className="h-14 w-14 rounded-full flex items-center justify-center transition-all duration-300 ease-[var(--ease-apple)] active:scale-95 cursor-pointer"
                    style={{
                        backgroundColor: hyperfocusEnabled ? `${accentColor}20` : 'rgba(255,255,255,0.06)',
                        color: hyperfocusEnabled ? accentColor : 'rgba(255,255,255,0.4)',
                        border: hyperfocusEnabled ? `2px solid ${accentColor}40` : '2px solid transparent',
                    }}
                    aria-label={hyperfocusEnabled ? 'Disable hyperfocus' : 'Enable hyperfocus'}
                    title={hyperfocusEnabled ? 'Hyperfocus ON' : 'Hyperfocus OFF'}
                >
                    <Brain className="h-5 w-5" />
                </button>

                {/* Play / Pause button */}
                <button
                    onClick={isActive ? onPause : onStart}
                    className="h-16 w-16 rounded-full flex items-center justify-center transition-all duration-300 ease-[var(--ease-apple)] hover:brightness-110 active:scale-95 shadow-lg cursor-pointer"
                    style={{
                        backgroundColor: accentColor,
                        // A ring signals that the next click starts a locked session.
                        boxShadow: confirmingStart ? `0 0 0 4px #1A1B24, 0 0 0 6px ${accentColor}` : undefined,
                    }}
                    aria-label={isActive ? 'Pause' : confirmingStart ? 'Click again to start' : 'Start'}
                >
                    {isActive ? (
                        <Pause className="h-6 w-6 text-white fill-white" />
                    ) : (
                        <Play className="h-6 w-6 text-white fill-white ml-0.5" />
                    )}
                </button>

                {/* Skip button */}
                <button
                    onClick={onSkip}
                    disabled={status === 'idle' || !canSkip}
                    aria-hidden={!canSkip}
                    className={cn(
                        'h-14 w-14 rounded-full flex items-center justify-center transition-all duration-300 ease-[var(--ease-apple)] active:scale-95 disabled:opacity-30 cursor-pointer disabled:cursor-default',
                        !canSkip && '!opacity-0',
                    )}
                    style={{
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.4)',
                    }}
                    aria-label="Skip"
                >
                    <SkipForward className="h-5 w-5" />
                </button>
            </div>

            {/* Reserve the line so the layout does not jump when the hint appears. */}
            <p
                className="h-4 text-xs text-zinc-400 transition-opacity duration-300 ease-[var(--ease-apple)]"
                style={{ opacity: confirmingStart ? 1 : 0 }}
                aria-live="polite"
            >
                {confirmingStart ? 'No giving up is on. Click again to start.' : ''}
            </p>
        </div>
    )
}
