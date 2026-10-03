'use client'

import { useTimerStore } from '@/stores/timerStore'
import { Switch } from '@/components/ui/switch'
import { SettingRow, SettingsSection } from './SettingsSection'

export function AutoStartSection() {
    const settings = useTimerStore((s) => s.settings)
    const updateSettings = useTimerStore((s) => s.updateSettings)

    return (
        <SettingsSection title="Auto-start">
            <div className="space-y-3">
                <SettingRow label="Breaks" description="Automatically start break timers">
                    <Switch
                        checked={settings.autoStartBreaks}
                        onCheckedChange={(v) => updateSettings({ autoStartBreaks: v })}
                    />
                </SettingRow>
                <SettingRow label="Pomodoros" description="Automatically start focus timers">
                    <Switch
                        checked={settings.autoStartPomodoros}
                        onCheckedChange={(v) => updateSettings({ autoStartPomodoros: v })}
                    />
                </SettingRow>
            </div>
        </SettingsSection>
    )
}
