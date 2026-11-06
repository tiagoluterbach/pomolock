'use client'

import { useEffect, useRef } from 'react'
import { useUser } from '@/hooks/useUser'
import { useTimerStore } from '@/stores/timerStore'
import { createClient } from '@/lib/supabase/client'
import {
    fetchCloudSessions,
    fetchCloudSettings,
    mergeCloudSettings,
    onReconnect,
    pushSessionsToCloud,
    pushSettingsToCloud,
    sendSessionsBeforeClose,
    syncOnLogin,
} from '@/lib/syncController'

// Coming back to the app refreshes it, at most this often (focus events come in bursts).
const REFRESH_THROTTLE_MS = 15000

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

async function pullCloudSessions() {
    const sessions = await fetchCloudSessions()
    if (sessions) useTimerStore.getState().setCloudSessions(sessions)
}

// One sync at a time: a download that started before an upload finished would
// replace the list without that session, hiding it until the next refresh.
let queue: Promise<unknown> = Promise.resolve()
function enqueue(task: () => Promise<unknown>) {
    queue = queue.then(task).catch((err) => console.error('Sync failed:', err))
}

/**
 * SyncProvider - handles bidirectional sync between localStorage and Supabase.
 *
 * On login: pulls cloud settings, pushes pending sessions, and prefetches cloud sessions.
 * On new session or reconnect: pushes pending sessions (debounced).
 * On returning to the app: pushes pending sessions, pulls what other devices saved.
 * On leaving the app or closing the page: sends pending sessions right away.
 * On settings change: pushes settings to cloud (debounced).
 */
export function SyncProvider() {
    const { user } = useUser()
    const hasSyncedRef = useRef(false)
    // Local settings not confirmed by the cloud yet; a pull must not undo them.
    const settingsDirtyRef = useRef(false)
    // Readable synchronously, for pages about to close.
    const accessTokenRef = useRef<string | null>(null)

    useEffect(() => {
        const { data: { subscription } } = createClient().auth.onAuthStateChange((_event, session) => {
            accessTokenRef.current = session?.access_token ?? null
        })
        return () => subscription.unsubscribe()
    }, [])

    // Sync on login
    useEffect(() => {
        if (!user || hasSyncedRef.current) return
        hasSyncedRef.current = true

        const { settings, pendingSessions, replaceSettings, removeSyncedSessions } = useTimerStore.getState()

        enqueue(async () => {
            await syncOnLogin(settings, pendingSessions, replaceSettings, removeSyncedSessions)
            // After sync, prefetch all cloud sessions for the dashboard
            await pullCloudSessions()
        })
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
            timeout = setTimeout(() => enqueue(flushPendingSessions), 1000)
        }

        const sendNow = () => {
            if (accessTokenRef.current) {
                sendSessionsBeforeClose(useTimerStore.getState().pendingSessions, user.id, accessTokenRef.current)
            }
        }

        const unsub = useTimerStore.subscribe((state, prev) => {
            // The page is closing: the debounce above would never fire.
            if (state.closedAt !== null && prev.closedAt === null) sendNow()
            else if (state.pendingSessions.length > prev.pendingSessions.length) schedule()
        })
        const stopListening = onReconnect(schedule)

        return () => {
            unsub()
            stopListening()
            clearTimeout(timeout)
        }
    }, [user])

    // Returning to the app shows what other devices saved meanwhile; leaving it
    // uploads what is waiting, since phones may kill the app without notice.
    useEffect(() => {
        if (!user) return

        let lastRefresh = Date.now()
        const refresh = () => {
            if (Date.now() - lastRefresh < REFRESH_THROTTLE_MS) return
            lastRefresh = Date.now()
            enqueue(async () => {
                await flushPendingSessions()
                await pullCloudSessions()
                if (settingsDirtyRef.current) return
                const cloud = await fetchCloudSettings()
                if (!cloud || settingsDirtyRef.current) return
                const { settings, replaceSettings } = useTimerStore.getState()
                const merged = mergeCloudSettings(settings, cloud)
                if (JSON.stringify(merged) !== JSON.stringify(settings)) replaceSettings(merged)
            })
        }
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refresh()
            } else if (accessTokenRef.current) {
                sendSessionsBeforeClose(useTimerStore.getState().pendingSessions, user.id, accessTokenRef.current)
            }
        }

        window.addEventListener('focus', refresh)
        document.addEventListener('visibilitychange', onVisibilityChange)
        return () => {
            window.removeEventListener('focus', refresh)
            document.removeEventListener('visibilitychange', onVisibilityChange)
        }
    }, [user])

    // Push settings to cloud on change (debounced). The store replaces the
    // settings object on every change, so a reference check is enough.
    useEffect(() => {
        if (!user) return

        let timeout: ReturnType<typeof setTimeout> | undefined
        const unsub = useTimerStore.subscribe((state, prev) => {
            if (state.settings === prev.settings) return
            settingsDirtyRef.current = true
            clearTimeout(timeout)
            // Wait 2 seconds after the last change
            timeout = setTimeout(() => {
                pushSettingsToCloud(useTimerStore.getState().settings)
                    .then((saved) => {
                        if (saved) settingsDirtyRef.current = false
                    })
                    .catch(console.error)
            }, 2000)
        })

        return () => {
            unsub()
            clearTimeout(timeout)
        }
    }, [user])

    return null
}
