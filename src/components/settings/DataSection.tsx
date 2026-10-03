'use client'

import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { useTimerStore } from '@/stores/timerStore'
import { useAllSessions } from '@/hooks/useAllSessions'
import { downloadExport, getSessionMonths } from '@/lib/exportData'
import { Button } from '@/components/ui/button'
import { SettingsSection } from './SettingsSection'

export function DataSection() {
    const settings = useTimerStore((s) => s.settings)
    const sessions = useAllSessions()
    const months = useMemo(() => getSessionMonths(sessions), [sessions])
    const [period, setPeriod] = useState('all')

    const monthLabel = (month: string) => {
        const [year, m] = month.split('-').map(Number)
        const label = new Date(year, m - 1).toLocaleDateString(
            settings.locale === 'pt-BR' ? 'pt-BR' : 'en-US',
            { month: 'long', year: 'numeric' },
        )
        return label.charAt(0).toUpperCase() + label.slice(1)
    }

    return (
        <SettingsSection title="Data">
            <div className="flex items-center gap-4">
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-sm text-zinc-300 rounded-md h-9 px-3 outline-none focus:ring-1 focus:ring-zinc-600"
                >
                    <option value="all">All time</option>
                    {months.map((month) => (
                        <option key={month} value={month}>{monthLabel(month)}</option>
                    ))}
                </select>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadExport(settings, sessions, period)}
                    className="text-zinc-400 hover:text-white hover:bg-zinc-800/60 gap-2"
                >
                    <Download className="h-4 w-4" />
                    Export (JSON)
                </Button>
            </div>
        </SettingsSection>
    )
}
