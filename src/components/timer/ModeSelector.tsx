'use client'

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
        <div className="w-full max-w-md mx-auto">
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
