import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export function SettingsSection({ title, danger, children }: {
    title: string
    danger?: boolean
    children: ReactNode
}) {
    return (
        <section className="space-y-4">
            <h2 className={cn('text-base font-semibold', danger ? 'text-red-400' : 'text-white')}>{title}</h2>
            <div className={cn('border-t', danger ? 'border-red-900/30' : 'border-zinc-800')} />
            {children}
        </section>
    )
}

/** Label and description on the left, control on the right. */
export function SettingRow({ label, description, children }: {
    label: string
    description: string
    children: ReactNode
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div>
                <Label className="text-sm text-zinc-300">{label}</Label>
                <p className="text-xs text-zinc-600">{description}</p>
            </div>
            {children}
        </div>
    )
}
