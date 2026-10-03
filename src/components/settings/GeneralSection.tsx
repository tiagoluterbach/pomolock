'use client'

import { useTimerStore } from '@/stores/timerStore'
import { useUser } from '@/hooks/useUser'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { SettingRow, SettingsSection } from './SettingsSection'

export function GeneralSection() {
    const settings = useTimerStore((s) => s.settings)
    const updateSettings = useTimerStore((s) => s.updateSettings)
    const { user } = useUser()

    return (
        <SettingsSection title="General">
            <SettingRow label="Your name" description="Used in the greeting on the timer">
                <Input
                    value={settings.displayName ?? ''}
                    onChange={(e) => updateSettings({ displayName: e.target.value })}
                    placeholder={user?.user_metadata?.full_name?.split(' ')[0] ?? 'Name'}
                    maxLength={30}
                    className="bg-zinc-800 border-zinc-700 text-white h-9 w-40"
                />
            </SettingRow>
            <SettingRow label="Show timer in browser tab" description="Display remaining time in the tab title">
                <Switch
                    checked={settings.showTimerInTitle ?? true}
                    onCheckedChange={(v) => updateSettings({ showTimerInTitle: v })}
                />
            </SettingRow>
        </SettingsSection>
    )
}
