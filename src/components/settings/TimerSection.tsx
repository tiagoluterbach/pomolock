'use client'

import { useState, type KeyboardEvent } from 'react'
import { Lock } from 'lucide-react'
import { useTimerStore, isSessionInProgress } from '@/stores/timerStore'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { AppSettings } from '@/types'
import { SettingRow, SettingsSection } from './SettingsSection'

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

function NumberField({ label, max, value, disabled, onChange, onCommit, className }: {
    label: string
    max: number
    value: string
    disabled: boolean
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
                disabled={disabled}
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
    // Changing these mid-session would rewrite a phase already under way.
    const locked = useTimerStore((s) => isSessionInProgress(s.status))

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
    const commit = (field: DurationField, max: number) => () => {
        const num = Number(inputs[field])
        if (inputs[field] !== '' && Number.isInteger(num) && num >= 1 && num <= max) {
            if (num !== settings[field]) updateSettings({ [field]: num })
        } else {
            setInputs((prev) => ({ ...prev, [field]: String(settings[field]) }))
        }
    }

    const field = (name: DurationField, max: number) => ({
        max,
        value: inputs[name],
        disabled: locked,
        onChange: setInput(name),
        onCommit: commit(name, max),
    })

    return (
        <SettingsSection title="Timer">
            {locked && (
                <p className="flex items-center gap-2 text-xs text-zinc-400">
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    A session is in progress. The durations unlock when it ends.
                </p>
            )}

            <div className="space-y-1">
                <Label className="text-xs text-zinc-500">Duration (minutes)</Label>
                <div className="grid grid-cols-3 gap-3">
                    <NumberField label="Focus" {...field('focusDuration', 120)} />
                    <NumberField label="Short Break" {...field('shortBreakDuration', 60)} />
                    <NumberField label="Long Break" {...field('longBreakDuration', 60)} />
                </div>
            </div>

            <NumberField
                label="Pomodoros until long break"
                className="w-20"
                {...field('pomodorosUntilLongBreak', 12)}
            />

            <SettingRow
                label="No giving up"
                description="Hides skip, reset and mode switching until the Pomodoro ends. Starting takes a second click. Turning it off brings them back at any time."
            >
                {/* Never locked: it is the way out when plans change mid-session. */}
                <Switch
                    checked={settings.noGiveUp}
                    onCheckedChange={(v) => updateSettings({ noGiveUp: v })}
                />
            </SettingRow>
        </SettingsSection>
    )
}
