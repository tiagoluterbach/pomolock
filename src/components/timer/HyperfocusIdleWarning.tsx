'use client'

import { useEffect, useState } from 'react'
import { useTimerStore, HYPERFOCUS_IDLE_WARNING_MS, HYPERFOCUS_IDLE_GRACE_MS } from '@/stores/timerStore'
import { formatClock } from '@/lib/utils'

interface HyperfocusIdleWarningProps {
    accentColor: string
}

/** Asks for confirmation after a long hyperfocus stretch without interaction. */
export function HyperfocusIdleWarning({ accentColor }: HyperfocusIdleWarningProps) {
    const status = useTimerStore((s) => s.status)
    const lastActivityAt = useTimerStore((s) => s.lastActivityAt)
    const markActivity = useTimerStore((s) => s.markActivity)
    // Refresh every second while counting so the countdown stays current.
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        if (status !== 'hyperfocus') return
        const id = window.setInterval(() => setNow(Date.now()), 1000)
        return () => window.clearInterval(id)
    }, [status])

    if (status !== 'hyperfocus' || lastActivityAt === null) return null
    const idleMs = now - lastActivityAt
    if (idleMs < HYPERFOCUS_IDLE_WARNING_MS) return null

    const pauseInSeconds = Math.max(
        0,
        Math.ceil((HYPERFOCUS_IDLE_WARNING_MS + HYPERFOCUS_IDLE_GRACE_MS - idleMs) / 1000),
    )

    return (
        <div
            role="alertdialog"
            aria-label="Still studying?"
            className="w-full max-w-md mb-6 rounded-xl px-4 py-3 flex items-center justify-between gap-3 bg-zinc-800/60"
            style={{
                border: `1px solid ${accentColor}60`,
                animation: 'spring-down 600ms var(--ease-apple) both',
            }}
        >
            <div className="text-sm">
                <p className="font-semibold text-white">Still studying?</p>
                <p className="text-zinc-400 tabular-nums">
                    Hyperfocus pauses in {formatClock(pauseInSeconds)}
                </p>
            </div>
            <button
                onClick={markActivity}
                className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-white cursor-pointer"
                style={{ backgroundColor: accentColor }}
            >
                I&apos;m here
            </button>
        </div>
    )
}
