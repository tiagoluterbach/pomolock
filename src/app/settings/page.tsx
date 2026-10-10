'use client'

import { PageHeader } from '@/components/PageHeader'
import { AccountSection } from '@/components/settings/AccountSection'
import { TimerSection } from '@/components/settings/TimerSection'
import { AutoStartSection } from '@/components/settings/AutoStartSection'
import { SoundSection } from '@/components/settings/SoundSection'
import { GeneralSection } from '@/components/settings/GeneralSection'
import { DataSection } from '@/components/settings/DataSection'
import { AppearanceSection } from '@/components/settings/AppearanceSection'
import { DangerZoneSection } from '@/components/settings/DangerZoneSection'

export default function SettingsPage() {
    return (
        <div className="min-h-screen bg-[#1A1B24] pt-16 pb-16 px-4">
            <div className="max-w-lg mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-1 duration-500 ease-[var(--ease-apple)]">
                <PageHeader title="Settings" />
                <AccountSection />
                <TimerSection />
                <AutoStartSection />
                <SoundSection />
                <GeneralSection />
                <DataSection />
                <AppearanceSection />
                <DangerZoneSection />
            </div>
        </div>
    )
}
