'use client'

import { useTimerStore } from '@/stores/timerStore'
import { Switch } from '@/components/ui/switch'
import { SettingRow, SettingsSection } from './SettingsSection'

export function GeneralSection() {
    const settings = useTimerStore((s) => s.settings)
    const updateSettings = useTimerStore((s) => s.updateSettings)

    return (
        <SettingsSection title="General">
            <SettingRow label="Show timer in browser tab" description="Display remaining time in the tab title">
                <Switch
                    checked={settings.showTimerInTitle ?? true}
                    onCheckedChange={(v) => updateSettings({ showTimerInTitle: v })}
                />
            </SettingRow>
        </SettingsSection>
    )
}
