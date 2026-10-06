'use client'

import { useState, useMemo } from 'react'
import { DayCell } from './DayCell'
import { MonthNavigator } from './MonthNavigator'
import { MONTH_SHORT, EMPTY_CELL_COLOR, getIntensityColors } from './heatmap'
import type { DayStats } from '@/types'

const WEEK_DAYS = ['seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.', 'dom.']

interface HeatmapCalendarProps {
    sessions: DayStats[]
    accentColor: string
}

function getCalendarGrid(year: number, month: number) {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()

    let startDay = firstDay.getDay() - 1
    if (startDay < 0) startDay = 6

    const grid: (number | null)[] = []

    for (let i = 0; i < startDay; i++) {
        grid.push(null)
    }

    for (let d = 1; d <= daysInMonth; d++) {
        grid.push(d)
    }

    return grid
}

export function HeatmapCalendar({ sessions, accentColor }: HeatmapCalendarProps) {
    const today = new Date()
    const [year, setYear] = useState(today.getFullYear())
    const [month, setMonth] = useState(today.getMonth())

    const grid = useMemo(() => getCalendarGrid(year, month), [year, month])

    const monthDays = useMemo(
        () => sessions.filter((s) => {
            const [y, m] = s.date.split('-').map(Number)
            return y === year && (m - 1) === month
        }),
        [sessions, year, month],
    )

    const dayMap = useMemo(
        () => new Map(monthDays.map((s) => [Number(s.date.slice(8, 10)), s.totalMinutes])),
        [monthDays],
    )

    // Sum seconds so the month total does not lose each day's partial minute.
    const totalMinutes = Math.floor(monthDays.reduce((sum, s) => sum + s.totalSeconds, 0) / 60)

    const handlePrevious = () => {
        if (month === 0) {
            setYear(year - 1)
            setMonth(11)
        } else {
            setMonth(month - 1)
        }
    }

    const handleNext = () => {
        if (month === 11) {
            setYear(year + 1)
            setMonth(0)
        } else {
            setMonth(month + 1)
        }
    }

    const isToday = (day: number | null) => {
        if (day === null) return false
        return (
            year === today.getFullYear() &&
            month === today.getMonth() &&
            day === today.getDate()
        )
    }

    const intensityColors = useMemo(() => getIntensityColors(accentColor), [accentColor])

    const totalHours = Math.floor(totalMinutes / 60)
    const remainingMin = totalMinutes % 60

    return (
        <div className="space-y-3">
            <MonthNavigator
                year={year}
                month={month}
                onPrevious={handlePrevious}
                onNext={handleNext}
                totalMinutes={totalMinutes}
            />

            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-[5px]">
                {WEEK_DAYS.map((d) => (
                    <div
                        key={d}
                        className="text-center text-[11px] text-zinc-500 font-medium pb-1"
                    >
                        {d}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-[5px]">
                {grid.map((day, i) => (
                    <DayCell
                        key={i}
                        day={day}
                        totalMinutes={day !== null ? (dayMap.get(day) ?? 0) : 0}
                        isToday={isToday(day)}
                        intensityColors={intensityColors}
                    />
                ))}
            </div>

            {/* Legend + total (YPT style) */}
            <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1">
                    {['0+', '2+', '4+', '6+', '10+'].map((label, i) => (
                        <div key={label} className="flex items-center gap-0.5">
                            <div
                                className="w-[18px] h-[14px] rounded-[3px]"
                                style={{
                                    backgroundColor: i === 0 ? EMPTY_CELL_COLOR : intensityColors[i],
                                }}
                            />
                            <span className="text-[9px] text-zinc-500 font-medium mr-0.5">
                                {label}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="text-[12px] text-zinc-400 font-medium tabular-nums">
                    {MONTH_SHORT[month]}: {totalHours}H {remainingMin}M
                </div>
            </div>
        </div>
    )
}
