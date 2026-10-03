import type { AppSettings, FocusSession } from '@/types'
import { getLocalMonthString } from '@/lib/utils'

/** ISO timestamp with the local UTC offset, e.g. 2026-10-03T14:05:00-03:00. */
function toLocalISOString(date: Date): string {
    const tzOffset = -date.getTimezoneOffset()
    const sign = tzOffset >= 0 ? '+' : '-'
    const pad = (n: number) => `${Math.floor(Math.abs(n))}`.padStart(2, '0')

    return date.getFullYear() +
        '-' + pad(date.getMonth() + 1) +
        '-' + pad(date.getDate()) +
        'T' + pad(date.getHours()) +
        ':' + pad(date.getMinutes()) +
        ':' + pad(date.getSeconds()) +
        sign + pad(tzOffset / 60) +
        ':' + pad(tzOffset % 60)
}

/** Months (YYYY-MM) that have sessions, newest first. */
export function getSessionMonths(sessions: FocusSession[]): string[] {
    const months = new Set<string>()
    for (const s of sessions) {
        if (s.startedAt) months.add(getLocalMonthString(new Date(s.startedAt)))
    }
    return Array.from(months).sort().reverse()
}

/**
 * Download settings and sessions as JSON. `period` is 'all' or a YYYY-MM month.
 * Timestamps are written in local time so the file reads naturally.
 */
export function downloadExport(settings: AppSettings, sessions: FocusSession[], period: string) {
    const selected = period === 'all'
        ? sessions
        : sessions.filter((s) => s.startedAt && getLocalMonthString(new Date(s.startedAt)) === period)

    const data = {
        exportedAt: toLocalISOString(new Date()),
        settings,
        sessions: selected.map((s) => ({
            ...s,
            startedAt: s.startedAt ? toLocalISOString(new Date(s.startedAt)) : s.startedAt,
            createdAt: s.createdAt ? toLocalISOString(new Date(s.createdAt)) : s.createdAt,
        })),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pomolock-export-${period}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
}
