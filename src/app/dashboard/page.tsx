'use client'

import { useMemo } from 'react'
import { Flame } from 'lucide-react'
import { HeatmapCalendar } from '@/components/dashboard/HeatmapCalendar'
import { PageHeader } from '@/components/PageHeader'
import { useAllSessions } from '@/hooks/useAllSessions'
import { useTimerStore } from '@/stores/timerStore'
import { buildDayStats, calculateStreak } from '@/lib/stats'

export default function DashboardPage() {
    const dashboardAccent = useTimerStore((s) => s.settings.dashboardAccent) || '#8b5cf6'
    const allSessions = useAllSessions()
    const days = useMemo(() => buildDayStats(allSessions), [allSessions])
    const streak = calculateStreak(days)

    return (
        <div className="min-h-screen bg-[#1A1B24] pt-16 px-4 pb-8">
            <div className="max-w-lg mx-auto space-y-6">
                <PageHeader title="Statistics" />

                {streak > 0 && (
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <Flame className="h-4 w-4 text-orange-400/70" />
                        <span>{streak} day{streak !== 1 ? 's' : ''} streak</span>
                    </div>
                )}

                <div className="bg-zinc-800/30 rounded-xl p-5 border border-zinc-700/30 transform scale-110 origin-top">
                    <HeatmapCalendar sessions={days} accentColor={dashboardAccent} />
                </div>
            </div>
        </div>
    )
}
