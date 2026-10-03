'use client'

import { useTimerStore } from '@/stores/timerStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { DEFAULT_SETTINGS, type ModeColors } from '@/types'
import { SettingsSection } from './SettingsSection'

const MODE_COLOR_FIELDS: { key: keyof ModeColors; label: string }[] = [
    { key: 'focus', label: 'Focus' },
    { key: 'shortBreak', label: 'Short Break' },
    { key: 'longBreak', label: 'Long Break' },
    { key: 'hyperfocus', label: 'Hyperfocus' },
]

function ColorInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    return (
        <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-8 h-8 rounded-full border-0 cursor-pointer bg-transparent [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-moz-color-swatch]:rounded-full"
        />
    )
}

export function AppearanceSection() {
    const settings = useTimerStore((s) => s.settings)
    const updateSettings = useTimerStore((s) => s.updateSettings)

    return (
        <SettingsSection title="Appearance">
            <div className="space-y-3">
                <Label className="text-xs text-zinc-500">Accent Colors</Label>
                <div className="grid grid-cols-2 gap-3">
                    {MODE_COLOR_FIELDS.map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-2">
                            <ColorInput
                                value={settings.modeColors[key]}
                                onChange={(color) =>
                                    updateSettings({ modeColors: { ...settings.modeColors, [key]: color } })
                                }
                            />
                            <Label className="text-xs text-zinc-400">{label}</Label>
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                        <ColorInput
                            value={settings.dashboardAccent}
                            onChange={(color) => updateSettings({ dashboardAccent: color })}
                        />
                        <Label className="text-xs text-zinc-400">Dashboard</Label>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                            updateSettings({
                                dashboardAccent: DEFAULT_SETTINGS.dashboardAccent,
                                modeColors: DEFAULT_SETTINGS.modeColors,
                            })
                        }
                        className="text-[10px] h-6 px-2 text-zinc-500 hover:text-zinc-300"
                    >
                        Reset to Default
                    </Button>
                </div>
            </div>
        </SettingsSection>
    )
}
