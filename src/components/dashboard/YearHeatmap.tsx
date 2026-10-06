'use client'

import { useEffect, useMemo, useRef } from 'react'
import { getLocalDateString } from '@/lib/utils'
import { getHeatmapIntensity, type DayStats } from '@/types'
import { MONTH_SHORT } from './heatmap'

const WEEKS = 53
// GitHub's dark theme contribution colors, from no study to most study.
const LEVEL_COLORS = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353']
const ROW_LABELS = ['seg.', '', 'qua.', '', 'sex.', '', ''] // Monday-first, like the month view

interface YearHeatmapProps {
    days: DayStats[]
}

interface Cell {
    date: string
    month: number
    minutes: number
    future: boolean
}

/** GitHub-style grid of the last 53 weeks: one column per week, Monday on top. */
function buildWeeks(minutesByDate: Map<string, number>): Cell[][] {
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    // Monday of the current week, then back to the first week shown.
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (WEEKS - 1) * 7)

    const todayString = getLocalDateString(today)
    const weeks: Cell[][] = []
    for (let w = 0; w < WEEKS; w++) {
        const week: Cell[] = []
        for (let d = 0; d < 7; d++) {
            const date = getLocalDateString(start)
            week.push({
                date,
                month: start.getMonth(),
                minutes: minutesByDate.get(date) ?? 0,
                future: date > todayString,
            })
            start.setDate(start.getDate() + 1)
        }
        weeks.push(week)
    }
    return weeks
}

function formatDuration(minutes: number): string {
    return `${Math.floor(minutes / 60)}h ${minutes % 60}min`
}

export function YearHeatmap({ days }: YearHeatmapProps) {
    const weeks = useMemo(
        () => buildWeeks(new Map(days.map((d) => [d.date, d.totalMinutes]))),
        [days],
    )

    const firstDate = weeks[0][0].date
    const totalMinutes = Math.floor(
        days.filter((d) => d.date >= firstDate).reduce((sum, d) => sum + d.totalSeconds, 0) / 60,
    )
    const activeDays = days.filter((d) => d.date >= firstDate && d.totalMinutes > 0).length

    // Label a column when its week starts a new month.
    const monthLabels = weeks.map((week, i) =>
        i === 0 || week[0].month !== weeks[i - 1][0].month ? MONTH_SHORT[week[0].month] : '',
    )

    // On narrow screens the grid scrolls; start at the most recent weeks.
    const scrollRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const el = scrollRef.current
        if (el) el.scrollLeft = el.scrollWidth
    }, [])

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Last 12 months</h2>
                <div className="text-sm text-zinc-400 font-mono tabular-nums">
                    {formatDuration(totalMinutes)}
                </div>
            </div>

            <div ref={scrollRef} className="overflow-x-auto pb-1">
                <div className="flex gap-1.5 min-w-max">
                    {/* Week day labels */}
                    <div className="grid grid-rows-[12px_repeat(7,9px)] gap-[2px] text-[9px] text-zinc-500 leading-[9px]">
                        <span />
                        {ROW_LABELS.map((label, i) => <span key={i}>{label}</span>)}
                    </div>

                    <div className="grid grid-flow-col grid-rows-[12px_repeat(7,9px)] auto-cols-[9px] gap-[2px]">
                        {weeks.map((week, w) => (
                            <div key={week[0].date} className="contents">
                                <span className="text-[9px] text-zinc-500 leading-[12px] whitespace-nowrap overflow-visible">
                                    {monthLabels[w]}
                                </span>
                                {week.map((cell) => {
                                    return (
                                        <div
                                            key={cell.date}
                                            className="rounded-[2px]"
                                            title={cell.future ? undefined : `${cell.date.split('-').reverse().join('/')}: ${formatDuration(cell.minutes)}`}
                                            style={{
                                                backgroundColor: cell.future
                                                    ? 'transparent'
                                                    : LEVEL_COLORS[getHeatmapIntensity(cell.minutes)],
                                            }}
                                        />
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between text-[12px] text-zinc-400">
                <span>{activeDays} day{activeDays !== 1 ? 's' : ''} studied</span>
                <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                    less
                    {LEVEL_COLORS.map((color) => (
                        <div
                            key={color}
                            className="w-[9px] h-[9px] rounded-[2px]"
                            style={{ backgroundColor: color }}
                        />
                    ))}
                    more
                </div>
            </div>
        </div>
    )
}
