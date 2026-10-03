import { useMemo } from 'react'
import { useTimerStore } from '@/stores/timerStore'
import type { FocusSession } from '@/types'

/** Cloud sessions plus local ones not synced yet, deduplicated by id. */
export function useAllSessions(): FocusSession[] {
    const pendingSessions = useTimerStore((s) => s.pendingSessions)
    const cloudSessions = useTimerStore((s) => s.cloudSessions)

    return useMemo(() => {
        const sessionMap = new Map<string, FocusSession>()
        for (const session of cloudSessions) sessionMap.set(session.id, session)
        for (const session of pendingSessions) {
            if (!sessionMap.has(session.id)) sessionMap.set(session.id, session)
        }
        return Array.from(sessionMap.values())
    }, [cloudSessions, pendingSessions])
}
