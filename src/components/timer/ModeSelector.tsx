'use client'

import { useState } from 'react'
import { Lock, LockOpen } from 'lucide-react'
import { useTimerStore } from '@/stores/timerStore'
import { cn } from '@/lib/utils'
import type { TimerMode } from '@/types'

const MODES: { value: TimerMode; label: string }[] = [
    { value: 'focus', label: 'PomoLock' },
    { value: 'shortBreak', label: 'Short Break' },
    { value: 'longBreak', label: 'Long Break' },
]

interface ModeSelectorProps {
    accentColor: string
    /** "No giving up" is holding the current focus: switching would end it. */
    locked: boolean
}

export function ModeSelector({ accentColor, locked }: ModeSelectorProps) {
    const mode = useTimerStore((s) => s.mode)
    const setMode = useTimerStore((s) => s.setMode)
    const reset = useTimerStore((s) => s.reset)
    const activeIndex = MODES.findIndex((m) => m.value === mode)

    // A lock snaps onto the selector while giving up is locked, and opens and
    // fades out when it is released (hyperfocus, or the setting turned off).
    const [lock, setLock] = useState({ locked, releasing: false })
    if (lock.locked !== locked) setLock({ locked, releasing: !locked })

    const handleClick = (value: TimerMode) => {
        // Stop any playing alarm when mode button is clicked
        window.dispatchEvent(new Event('pomodoro-stop-alarm'))

        if (value === mode) {
            // Clicking current tab resets the timer
            reset()
        } else {
            // Switching mode — setMode already resets to that mode's duration
            setMode(value)
        }
    }

    return (
        <div className="relative w-full max-w-md mx-auto">
            {(locked || lock.releasing) && (
                <span
                    aria-hidden="true"
                    className="absolute -top-2 -right-2 z-10 h-6 w-6 rounded-full flex items-center justify-center bg-zinc-900 border border-white/10 shadow-md"
                    style={{
                        color: accentColor,
                        animation: locked
                            ? 'lock-pop 400ms var(--ease-apple) both'
                            : 'lock-release 900ms var(--ease-apple) both',
                    }}
                    onAnimationEnd={() => {
                        if (!locked) setLock({ locked, releasing: false })
                    }}
                >
                    {locked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
                </span>
            )}
            <div
                className={cn(
                    'relative grid grid-cols-3 bg-zinc-800/60 rounded-xl p-1 gap-1 transition-opacity duration-300 ease-[var(--ease-apple)]',
                    locked && 'opacity-50',
                )}
                title={locked ? 'No giving up is on until this Pomodoro ends' : undefined}
            >
                {/* One pill slides under the active mode, like a macOS segmented control. */}
                <div
                    aria-hidden="true"
                    className="absolute top-1 bottom-1 left-1 rounded-lg shadow-sm transition-[transform,background-color] duration-500 ease-[var(--ease-apple)]"
                    style={{
                        width: 'calc((100% - 1rem) / 3)',
                        transform: `translateX(calc(${activeIndex} * (100% + 0.25rem)))`,
                        backgroundColor: accentColor,
                    }}
                />
                {MODES.map((m) => (
                    <button
                        key={m.value}
                        onClick={() => handleClick(m.value)}
                        disabled={locked}
                        className={cn(
                            'relative rounded-lg text-sm font-semibold py-2 transition-colors duration-300 ease-[var(--ease-apple)] disabled:cursor-not-allowed',
                            m.value === mode ? 'text-white' : 'text-zinc-400 enabled:hover:text-zinc-200',
                        )}
                    >
                        {m.label}
                    </button>
                ))}
            </div>
        </div>
    )
}
