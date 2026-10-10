'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTimerStore, getDurationForMode } from '@/stores/timerStore'

const SIZE = 280
const STROKE = 10
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

type RingState = ReturnType<typeof useTimerStore.getState>

/** Fraction of the phase still left, read from the same clock that measures it. */
export function remainingFraction(state: RingState, now: number, wholeSeconds: boolean): number {
    const { status, clock, mode, settings, phaseDuration, secondsRemaining } = state
    if (status === 'idle') return 1
    // Hyperfocus (running or paused) keeps the full ring.
    if (status === 'hyperfocus' || state.pausedFromHyperfocus) return 1

    let remainingMs = clock
        ? clock.remainingMs - (status === 'running' ? now - clock.anchoredAt : 0)
        : secondsRemaining * 1000
    if (wholeSeconds) remainingMs = Math.ceil(remainingMs / 1000) * 1000

    const totalMs = (phaseDuration ?? getDurationForMode(mode, settings)) * 1000
    return totalMs <= 0 ? 0 : Math.min(1, Math.max(0, remainingMs / totalMs))
}

interface ProgressRingProps {
    color: string
}

/**
 * The countdown ring. The empty part opens at 12 o'clock and grows clockwise,
 * like a clock hand. While running it follows the clock every frame instead
 * of jumping once per second, so it never sweeps after a reload or a reset.
 */
export function ProgressRing({ color }: ProgressRingProps) {
    const arcRef = useRef<SVGCircleElement>(null)
    const gradientRef = useRef<SVGAnimateElement>(null)
    const status = useTimerStore((s) => s.status)

    // When a focus runs into hyperfocus, the ring refills clockwise with a
    // gradient that starts at the focus color and settles on the hyperfocus one.
    const [sweep, setSweep] = useState<{ from: string; to: string } | null>(null)
    const [previous, setPrevious] = useState({ status, color })
    if (previous.status !== status || previous.color !== color) {
        setPrevious({ status, color })
        if (status === 'hyperfocus' && previous.status === 'running') {
            setSweep({ from: previous.color, to: color })
        }
    }

    useEffect(() => {
        if (sweep) gradientRef.current?.beginElement()
    }, [sweep])

    useEffect(() => {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        const draw = () => {
            const arc = arcRef.current
            if (!arc) return
            const visible = CIRCUMFERENCE * remainingFraction(useTimerStore.getState(), Date.now(), reduceMotion)
            // Shift the visible arc to the end of the path so the gap starts at the top.
            arc.style.strokeDasharray = `${visible} ${CIRCUMFERENCE}`
            arc.style.strokeDashoffset = `${visible - CIRCUMFERENCE}`
            // A round cap on a near-empty arc would leave a dot behind.
            arc.style.strokeLinecap = visible < STROKE ? 'butt' : 'round'
            arc.style.opacity = visible > 0 ? '1' : '0'
        }

        draw()
        const unsubscribe = useTimerStore.subscribe(draw)
        if (status !== 'running') return unsubscribe

        let frame = requestAnimationFrame(function loop() {
            draw()
            frame = requestAnimationFrame(loop)
        })
        return () => {
            cancelAnimationFrame(frame)
            unsubscribe()
        }
    }, [status])

    return (
        <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="w-[min(280px,78vw)] h-auto -rotate-90"
            aria-hidden="true"
        >
            <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={STROKE}
                fill="none"
            />
            <circle
                ref={arcRef}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                stroke={color}
                strokeWidth={STROKE}
                fill="none"
                className="transition-[stroke] duration-500 ease-[var(--ease-apple)]"
                style={{ visibility: sweep ? 'hidden' : undefined }}
            />
            {sweep && (
                <>
                    <defs>
                        <linearGradient id="hyperfocus-sweep" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={SIZE} y2={SIZE}>
                            <stop offset="0" stopColor={sweep.from}>
                                <animate
                                    ref={gradientRef}
                                    attributeName="stop-color"
                                    from={sweep.from}
                                    to={sweep.to}
                                    dur="1s"
                                    begin="indefinite"
                                    fill="freeze"
                                />
                            </stop>
                            <stop offset="1" stopColor={sweep.to} />
                        </linearGradient>
                    </defs>
                    <circle
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={RADIUS}
                        stroke="url(#hyperfocus-sweep)"
                        strokeWidth={STROKE}
                        strokeLinecap="round"
                        strokeDasharray={CIRCUMFERENCE}
                        fill="none"
                        style={{
                            '--ring-length': CIRCUMFERENCE,
                            animation: 'ring-sweep 1s var(--ease-apple) both',
                        } as CSSProperties}
                        onAnimationEnd={() => setSweep(null)}
                    />
                </>
            )}
        </svg>
    )
}
