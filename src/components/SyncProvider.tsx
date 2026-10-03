'use client'

import { useEffect, useRef } from 'react'
import { useUser } from '@/hooks/useUser'
import { useTimerStore } from '@/stores/timerStore'
import {
    syncOnLogin,
    pushSettingsToCloud,
    pushSessionsToCloud,
    fetchCloudSessions,
    onReconnect,
} from '@/lib/syncController'

/**
 * Push every pending session in one request and move the synced ones into
 * cloudSessions so the dashboard reflects them immediately.
 */
async function flushPendingSessions() {
    const { pendingSessions } = useTimerStore.getState()
    if (pendingSessions.length === 0) return

    const syncedIds = await pushSessionsToCloud(pendingSessions)
    if (syncedIds.length === 0) return

    const { cloudSessions, removeSyncedSessions, setCloudSessions } = useTimerStore.getState()
    const known = new Set(cloudSessions.map((s) => s.id))
    const synced = pendingSessions.filter((s) => syncedIds.includes(s.id) && !known.has(s.id))
    removeSyncedSessions(syncedIds)
    setCloudSessions([...cloudSessions, ...synced])
}

/**
 * SyncProvider - handles bidirectional sync between localStorage and Supabase.
 *
 * On login: pulls cloud settings, pushes pending sessions, and prefetches cloud sessions.
 * On new session or reconnect: pushes pending sessions (debounced).
 * On settings change: pushes settings to cloud (debounced).
 */
export function SyncProvider() {
    const { user } = useUser()
    const hasSyncedRef = useRef(false)

    // Sync on login
    useEffect(() => {
        if (!user || hasSyncedRef.current) return
        hasSyncedRef.current = true

        const { settings, pendingSessions, replaceSettings, removeSyncedSessions, setCloudSessions } = useTimerStore.getState()

        syncOnLogin(settings, pendingSessions, replaceSettings, removeSyncedSessions)
            // After sync, prefetch all cloud sessions for the dashboard
            .then(() => fetchCloudSessions())
            .then(setCloudSessions)
            .catch(console.error)
    }, [user])

    // Reset sync flag on logout
    useEffect(() => {
        if (!user) {
            hasSyncedRef.current = false
        }
    }, [user])

    // Push pending sessions when one is added or the connection comes back.
    // Failed pushes stay pending and are retried on the next trigger.
    useEffect(() => {
        if (!user) return

        let timeout: ReturnType<typeof setTimeout> | undefined
        const schedule = () => {
            clearTimeout(timeout)
            // Wait 1 second to batch rapid additions
            timeout = setTimeout(() => {
                flushPendingSessions().catch((err) => console.error('Failed to push sessions to cloud:', err))
            }, 1000)
        }

        const unsub = useTimerStore.subscribe((state, prev) => {
            if (state.pendingSessions.length > prev.pendingSessions.length) schedule()
        })
        const stopListening = onReconnect(schedule)

        return () => {
            unsub()
            stopListening()
            clearTimeout(timeout)
        }
    }, [user])

    // Push settings to cloud on change (debounced). The store replaces the
    // settings object on every change, so a reference check is enough.
    useEffect(() => {
        if (!user) return

        let timeout: ReturnType<typeof setTimeout> | undefined
        const unsub = useTimerStore.subscribe((state, prev) => {
            if (state.settings === prev.settings) return
            clearTimeout(timeout)
            // Wait 2 seconds after the last change
            timeout = setTimeout(() => {
                pushSettingsToCloud(useTimerStore.getState().settings).catch(console.error)
            }, 2000)
        })

        return () => {
            unsub()
            clearTimeout(timeout)
        }
    }, [user])

    return null
}
