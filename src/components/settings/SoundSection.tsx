'use client'

import { Volume2 } from 'lucide-react'
import { useTimerStore } from '@/stores/timerStore'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { ALARM_FILES, type AppSettings } from '@/types'
import { SettingRow, SettingsSection } from './SettingsSection'

const ALARM_OPTIONS: { value: AppSettings['alarmSound']; label: string }[] = [
    { value: 'bip', label: 'Bip' },
    { value: 'kazakhstan', label: 'Kazakhstan' },
]

export function SoundSection() {
    const settings = useTimerStore((s) => s.settings)
    const updateSettings = useTimerStore((s) => s.updateSettings)
    const alarmSound = settings.alarmSound ?? 'bip'

    const playTest = () => {
        const audio = new Audio(ALARM_FILES[alarmSound])
        audio.volume = settings.soundVolume
        audio.play().catch(() => { })
    }

    return (
        <SettingsSection title="Sound">
            <div className="space-y-4">
                <SettingRow label="Alarm sound" description="Play a sound when the timer ends">
                    <Switch
                        checked={settings.soundEnabled}
                        onCheckedChange={(v) => updateSettings({ soundEnabled: v })}
                    />
                </SettingRow>

                <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-500">Alarm Tone</Label>
                    <div className="flex items-center gap-2">
                        {ALARM_OPTIONS.map(({ value, label }) => (
                            <button
                                key={value}
                                onClick={() => updateSettings({ alarmSound: value })}
                                className={cn(
                                    'flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                                    alarmSound === value
                                        ? 'bg-zinc-600 text-white'
                                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                )}
                            >
                                {label}
                            </button>
                        ))}
                        <button
                            onClick={playTest}
                            className="p-1.5 rounded-md bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                            aria-label="Test alarm sound"
                            title="Test"
                        >
                            <Volume2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs text-zinc-500">Volume</Label>
                        <span className="text-xs text-zinc-500 tabular-nums">
                            {Math.round(settings.soundVolume * 100)}%
                        </span>
                    </div>
                    <Slider
                        min={0}
                        max={100}
                        step={5}
                        value={[settings.soundVolume * 100]}
                        onValueChange={([v]) => updateSettings({ soundVolume: v / 100 })}
                        className="w-full"
                    />
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs text-zinc-500">Repeat Count</Label>
                        <span className="text-xs text-zinc-500 tabular-nums">
                            {settings.alarmRepeatCount ?? 3}x
                        </span>
                    </div>
                    <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[settings.alarmRepeatCount ?? 3]}
                        onValueChange={([v]) => updateSettings({ alarmRepeatCount: v })}
                        className="w-full"
                    />
                </div>
            </div>
        </SettingsSection>
    )
}
