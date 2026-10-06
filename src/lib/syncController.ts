import { createClient } from '@/lib/supabase/client'
import type { AppSettings, FocusSession } from '@/types'
import { useTimerStore } from '@/stores/timerStore'

// ==========================================
// Sync Controller
// Handles bidirectional sync between localStorage and Supabase
// ==========================================

/**
 * Fetch user settings from Supabase and return them.
 * Returns null if no settings exist in the cloud.
 */
export async function fetchCloudSettings(): Promise<AppSettings | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single()

    if (error || !data) return null
    return data.settings as AppSettings
}

/**
 * Save user settings to Supabase (upsert).
 */
export async function pushSettingsToCloud(settings: AppSettings): Promise<boolean> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
        .from('user_settings')
        .upsert({
            user_id: user.id,
            settings,
            updated_at: new Date().toISOString(),
        })

    return !error
}

/**
 * Push focus sessions to Supabase in a single request.
 * Sessions never change after being saved, so rows that already exist are
 * skipped (this also makes retries safe). Returns the IDs that are now synced.
 */
export async function pushSessionsToCloud(sessions: FocusSession[]): Promise<string[]> {
    if (sessions.length === 0) return []

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { error } = await supabase
        .from('focus_sessions')
        .upsert(
            sessions.map((session) => ({
                id: session.id,
                user_id: user.id,
                started_at: session.startedAt,
                duration_minutes: session.durationMinutes,
                actual_duration_seconds: session.actualDurationSeconds,
                hyperfocus_seconds: session.hyperfocusSeconds,
                completed: session.completed,
                created_at: session.createdAt,
            })),
            { onConflict: 'id', ignoreDuplicates: true },
        )

    return error ? [] : sessions.map((session) => session.id)
}

/**
 * Fetch all focus sessions from Supabase for the current user.
 * Returns empty array if no sessions exist or user is not logged in.
 */
export async function fetchCloudSessions(): Promise<FocusSession[]> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    // Supabase returns at most 1000 rows per request, so read page by page.
    // Ordering by id too keeps pages stable when start times are equal.
    const PAGE_SIZE = 1000
    const data: Record<string, unknown>[] = []
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data: page, error } = await supabase
            .from('focus_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('started_at', { ascending: true })
            .order('id', { ascending: true })
            .range(from, from + PAGE_SIZE - 1)

        // A partial history would look like lost study time; show none instead.
        if (error || !page) return []
        data.push(...page)
        if (page.length < PAGE_SIZE) break
    }

    return data.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        userId: row.user_id as string,
        startedAt: row.started_at as string,
        durationMinutes: row.duration_minutes as number,
        actualDurationSeconds: row.actual_duration_seconds as number,
        hyperfocusSeconds: row.hyperfocus_seconds as number,
        completed: row.completed as boolean,
        createdAt: row.created_at as string,
    }))
}

/**
 * Delete all focus sessions from Supabase for the current user.
 * Used when resetting statistics.
 */
export async function deleteCloudSessions(): Promise<boolean> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
        .from('focus_sessions')
        .delete()
        .eq('user_id', user.id)

    return !error
}

/**
 * Reset statistics everywhere: cloud sessions first (when logged in), then the
 * local counters and sessions. Settings and the current timer are kept.
 * Returns false (and changes nothing locally) if the cloud delete fails.
 */
export async function resetStatistics(): Promise<boolean> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user && !(await deleteCloudSessions())) return false

    useTimerStore.getState().resetStats()
    return true
}

/** "Reset Statistics" button handler: confirm, reset, and report failures. */
export async function confirmAndResetStatistics() {
    if (!window.confirm('Are you sure you want to reset all statistics? This cannot be undone.')) return
    if (!(await resetStatistics())) {
        window.alert('Could not delete your synced sessions. Check your connection and try again.')
    }
}

/**
 * Full sync on login: pull cloud settings and push pending sessions.
 * Cloud settings take priority over local (last-write-wins from cloud).
 */
export async function syncOnLogin(
    localSettings: AppSettings,
    pendingSessions: FocusSession[],
    onSettingsMerged: (settings: AppSettings) => void,
    onSessionsSynced: (syncedIds: string[]) => void,
): Promise<void> {
    // 1. Fetch cloud settings
    const cloudSettings = await fetchCloudSettings()

    if (cloudSettings) {
        // Cloud wins — but deep merge to preserve new local fields
        const merged: AppSettings = {
            ...localSettings,
            ...cloudSettings,
            modeColors: {
                ...localSettings.modeColors,
                ...(cloudSettings.modeColors ?? {}),
            },
        }
        onSettingsMerged(merged)
    } else {
        // No cloud settings yet — push local settings to cloud
        await pushSettingsToCloud(localSettings)
    }

    // 2. Push pending sessions
    if (pendingSessions.length > 0) {
        const syncedIds = await pushSessionsToCloud(pendingSessions)
        if (syncedIds.length > 0) {
            onSessionsSynced(syncedIds)
        }
    }
}

/**
 * Listen for online/offline events and call the callback when coming back online.
 */
export function onReconnect(callback: () => void): () => void {
    if (typeof window === 'undefined') return () => { }

    const handler = () => {
        if (navigator.onLine) {
            callback()
        }
    }

    window.addEventListener('online', handler)
    return () => window.removeEventListener('online', handler)
}
