'use client'

import { Trash2 } from 'lucide-react'
import { confirmAndResetStatistics } from '@/lib/syncController'
import { Button } from '@/components/ui/button'
import { SettingsSection } from './SettingsSection'

export function DangerZoneSection() {
    return (
        <SettingsSection title="Danger Zone" danger>
            <Button variant="destructive" size="sm" onClick={confirmAndResetStatistics} className="w-full">
                <Trash2 className="h-4 w-4" />
                Reset Statistics
            </Button>
        </SettingsSection>
    )
}
