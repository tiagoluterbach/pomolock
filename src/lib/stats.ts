import type { DayStats, FocusSession } from '@/types'
import { getLocalDateString } from '@/lib/utils'

/** Total study time and session count per local day, oldest first. */
export function buildDayStats(sessions: FocusSession[]): DayStats[] {
    const dayMap = new Map<string, DayStats>()

    for (const session of sessions) {
        const date = getLocalDateString(new Date(session.startedAt))
        const existing = dayMap.get(date) || { date, totalSeconds: 0, totalMinutes: 0, sessionCount: 0 }
        // Sum seconds and round once, so partial minutes of each session add up.
        existing.totalSeconds += session.actualDurationSeconds
        existing.totalMinutes = Math.floor(existing.totalSeconds / 60)
        existing.sessionCount += 1
        dayMap.set(date, existing)
    }

    return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

/** Consecutive days with study time, ending today (or yesterday if today is empty). */
export function calculateStreak(days: DayStats[]): number {
    const studiedDates = new Set(days.filter((d) => d.totalMinutes > 0).map((d) => d.date))
    const checkDate = new Date()

    if (!studiedDates.has(getLocalDateString(checkDate))) {
        checkDate.setDate(checkDate.getDate() - 1)
    }

    let streak = 0
    while (studiedDates.has(getLocalDateString(checkDate))) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
    }
    return streak
}
