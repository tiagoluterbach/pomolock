'use client'

import { Check, ChevronDown } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { useIsClient } from '@/hooks/useIsClient'
import { ROADMAP, getAreaItems, type RoadmapItem } from '@/data/roadmap'
import { useRoadmapStore } from '@/stores/roadmapStore'
import { useTimerStore } from '@/stores/timerStore'

function ProgressBar({ value, color }: { value: number; color: string }) {
    return (
        <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{ width: `${Math.round(value * 100)}%`, backgroundColor: color }}
            />
        </div>
    )
}

function ChecklistItem({ item, done, color, onToggle }: {
    item: RoadmapItem
    done: boolean
    color: string
    onToggle: () => void
}) {
    return (
        <li>
            <button
                type="button"
                role="checkbox"
                aria-checked={done}
                onClick={onToggle}
                className="w-full flex items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
                <span
                    className="h-4 w-4 shrink-0 rounded-[4px] border flex items-center justify-center transition-colors"
                    style={done
                        ? { backgroundColor: color, borderColor: color }
                        : { borderColor: 'rgba(255,255,255,0.2)' }}
                >
                    {done && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                </span>
                <span className={`text-sm ${done ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
                    {item.label}
                </span>
                {item.project && (
                    <span className="ml-auto text-[10px] uppercase tracking-wider text-zinc-500 border border-zinc-700 rounded px-1.5 py-0.5">
                        Projeto
                    </span>
                )}
            </button>
        </li>
    )
}

export default function RoadmapPage() {
    const accent = useTimerStore((s) => s.settings.dashboardAccent) || '#8b5cf6'
    const completed = useRoadmapStore((s) => s.completed)
    const toggle = useRoadmapStore((s) => s.toggle)

    // Progress lives in localStorage; render it only on the client to avoid
    // a server/client mismatch on first paint.
    const isClient = useIsClient()
    const isDone = (id: string) => isClient && !!completed[id]

    const allItems = ROADMAP.flatMap(getAreaItems)
    const totalDone = allItems.filter((item) => isDone(item.id)).length

    return (
        <div className="min-h-screen bg-[#1A1B24] pt-16 px-4 pb-16">
            <div className="max-w-lg mx-auto space-y-6">
                <PageHeader title="Roadmap" />

                <div className="space-y-2">
                    <div className="flex items-baseline justify-between text-sm">
                        <span className="text-zinc-400">Data Science</span>
                        <span className="text-zinc-500 tabular-nums">
                            {totalDone}/{allItems.length}
                        </span>
                    </div>
                    <ProgressBar value={totalDone / allItems.length} color={accent} />
                </div>

                <div className="space-y-3">
                    {ROADMAP.map((area) => {
                        const items = getAreaItems(area)
                        const done = items.filter((item) => isDone(item.id)).length
                        return (
                            <details
                                key={area.id}
                                open
                                className="group bg-zinc-800/30 rounded-xl border border-zinc-700/30"
                            >
                                <summary className="list-none cursor-pointer select-none p-4 space-y-2 [&::-webkit-details-marker]:hidden">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-semibold text-white">{area.title}</h2>
                                        <span className="ml-auto text-xs text-zinc-500 tabular-nums">
                                            {done}/{items.length}
                                        </span>
                                        <ChevronDown className="h-4 w-4 text-zinc-500 transition-transform group-open:rotate-180" />
                                    </div>
                                    <ProgressBar value={done / items.length} color={accent} />
                                </summary>

                                <div className="px-2 pb-3 space-y-3">
                                    {area.groups.map((group, i) => (
                                        <div key={group.title ?? i}>
                                            {group.title && (
                                                <h3 className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                                    {group.title}
                                                </h3>
                                            )}
                                            <ul>
                                                {group.items.map((item) => (
                                                    <ChecklistItem
                                                        key={item.id}
                                                        item={item}
                                                        done={isDone(item.id)}
                                                        color={accent}
                                                        onToggle={() => toggle(item.id)}
                                                    />
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
