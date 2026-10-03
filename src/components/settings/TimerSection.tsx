'use client'

import { useState, type KeyboardEvent } from 'react'
import { useTimerStore } from '@/stores/timerStore'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { AppSettings } from '@/types'
import { SettingsSection } from './SettingsSection'

type DurationField =
    | 'focusDuration'
    | 'shortBreakDuration'
    | 'longBreakDuration'
    | 'pomodorosUntilLongBreak'

function toInputs(settings: AppSettings): Record<DurationField, string> {
    return {
        focusDuration: String(settings.focusDuration),
        shortBreakDuration: String(settings.shortBreakDuration),
        longBreakDuration: String(settings.longBreakDuration),
        pomodorosUntilLongBreak: String(settings.pomodorosUntilLongBreak),
    }
}

function NumberField({ label, max, value, onChange, onCommit, className }: {
    label: string
    max: number
    value: string
    onChange: (value: string) => void
    onCommit: () => void
    className?: string
}) {
    const blurOnEnter = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') e.currentTarget.blur()
    }

    return (
        <div>
            <Label className="text-xs text-zinc-500">{label}</Label>
            <Input
                type="number"
                min={1}
                max={max}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onCommit}
                onKeyDown={blurOnEnter}
                className={cn('bg-zinc-800 border-zinc-700 text-white h-9 text-center', className)}
            />
            {value === '' && <p className="text-[11px] text-red-500 mt-1">Required</p>}
        </div>
    )
}

export function TimerSection() {
    const settings = useTimerStore((s) => s.settings)
    const updateSettings = useTimerStore((s) => s.updateSettings)

    // Raw text per field, so a field can be empty while typing. Reset it when
    // the settings change elsewhere (e.g. cloud sync).
    const [inputs, setInputs] = useState(() => toInputs(settings))
    const [inputsFor, setInputsFor] = useState(settings)
    if (inputsFor !== settings) {
        setInputsFor(settings)
        setInputs(toInputs(settings))
    }

    const setInput = (field: DurationField) => (value: string) =>
        setInputs((prev) => ({ ...prev, [field]: value }))

    // Apply on blur instead of per keystroke: typing "30" would otherwise pass
    // through "3" and could end a running timer before the second digit.
    // Empty or invalid values restore the last saved one.
    const commit = (field: DurationField) => () => {
        const num = Number(inputs[field])
        if (inputs[field] !== '' && Number.isInteger(num) && num >= 1) {
            if (num !== settings[field]) updateSettings({ [field]: num })
        } else {
            setInputs((prev) => ({ ...prev, [field]: String(settings[field]) }))
        }
    }

    const field = (name: DurationField) => ({
        value: inputs[name],
        onChange: setInput(name),
        onCommit: commit(name),
    })

    return (
        <SettingsSection title="Timer">
            <div className="space-y-1">
                <Label className="text-xs text-zinc-500">Duration (minutes)</Label>
                <div className="grid grid-cols-3 gap-3">
                    <NumberField label="Focus" max={120} {...field('focusDuration')} />
                    <NumberField label="Short Break" max={60} {...field('shortBreakDuration')} />
                    <NumberField label="Long Break" max={60} {...field('longBreakDuration')} />
                </div>
            </div>

            <NumberField
                label="Pomodoros until long break"
                max={12}
                className="w-20"
                {...field('pomodorosUntilLongBreak')}
            />
        </SettingsSection>
    )
}
