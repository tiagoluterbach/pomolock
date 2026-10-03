'use client'

interface TimerDisplayProps {
    formattedTime: string
    modeLabel: string
    progress: number
    accentColor: string
    isRunning: boolean
    onReset: () => void
}

export function TimerDisplay({
    formattedTime,
    modeLabel,
    progress,
    accentColor,
    isRunning,
    onReset,
}: TimerDisplayProps) {
    // SVG circular progress — thicker ring always
    const size = 280
    const strokeWidth = 10
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference * (1 - progress)

    return (
        <div className="relative flex items-center justify-center">
            {/* SVG ring */}
            <svg
                width={size}
                height={size}
                className="transform -rotate-90"
            >
                {/* Background ring */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Progress ring — shrinks as time decreases */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={accentColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                />
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <span className="text-5xl sm:text-6xl font-bold text-white tabular-nums tracking-tight" style={{ fontFamily: 'var(--font-rubik)' }}>
                    {formattedTime}
                </span>
                <span className="text-sm font-medium tabular-nums" style={{ color: isRunning ? accentColor : 'rgba(161,161,170,1)' }}>
                    {modeLabel}
                </span>
                {/* Reset icon */}
                <button
                    onClick={onReset}
                    className="mt-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                    aria-label="Reset"
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
