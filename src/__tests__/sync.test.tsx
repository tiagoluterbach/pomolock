import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, type AppSettings, type FocusSession } from '@/types'

const mocks = vi.hoisted(() => ({
    fetchCloudSessions: vi.fn(),
    fetchCloudSettings: vi.fn(),
    pushSessionsToCloud: vi.fn(),
    pushSettingsToCloud: vi.fn(),
}))

vi.mock('@/hooks/useUser', () => {
    const user = { id: 'user-1' }
    return { useUser: () => ({ user, loading: false }) }
})

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        auth: {
            // Logged out as far as the real login sync is concerned; what it calls is mocked below.
            getUser: async () => ({ data: { user: null } }),
            onAuthStateChange: (callback: (event: string, session: { access_token: string }) => void) => {
                callback('INITIAL_SESSION', { access_token: 'token-1' })
                return { data: { subscription: { unsubscribe: () => {} } } }
            },
        },
    }),
}))

vi.mock('@/lib/syncController', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/syncController')>()),
    ...mocks,
}))

import { SyncProvider } from '@/components/SyncProvider'
import { useTimerStore } from '@/stores/timerStore'
import { sendSessionsBeforeClose } from '@/lib/syncController'

const store = () => useTimerStore.getState()
const initialState = useTimerStore.getInitialState()

const session = (id: string): FocusSession => ({
    id,
    userId: '',
    startedAt: '2026-11-06T12:00:00.000Z',
    durationMinutes: 15,
    actualDurationSeconds: 900,
    hyperfocusSeconds: 0,
    completed: false,
    createdAt: '2026-11-06T12:15:00.000Z',
})

async function settle(ms = 0) {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(ms)
    })
}

function returnToApp() {
    window.dispatchEvent(new Event('focus'))
}

beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-06T12:00:00-03:00'))
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    mocks.fetchCloudSessions.mockReset().mockResolvedValue([])
    mocks.fetchCloudSettings.mockReset().mockResolvedValue(null)
    mocks.pushSessionsToCloud.mockReset().mockImplementation(async (sessions: FocusSession[]) => sessions.map((s) => s.id))
    mocks.pushSettingsToCloud.mockReset().mockResolvedValue(true)
    useTimerStore.setState({ ...initialState, settings: DEFAULT_SETTINGS, pendingSessions: [], cloudSessions: [] })
})

afterEach(() => {
    cleanup()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.useRealTimers()
})

describe('sessions between devices', () => {
    it('shows what another device saved when returning to the app, without a reload', async () => {
        render(<SyncProvider />)
        await settle()
        expect(store().cloudSessions).toHaveLength(0)

        mocks.fetchCloudSessions.mockResolvedValue([session('from-pc')])
        await settle(20000)
        returnToApp()
        await settle()

        expect(store().cloudSessions.map((s) => s.id)).toEqual(['from-pc'])
    })

    it('keeps the history on screen when the request fails', async () => {
        mocks.fetchCloudSessions.mockResolvedValue([session('a')])
        render(<SyncProvider />)
        await settle()

        mocks.fetchCloudSessions.mockResolvedValue(null)
        await settle(20000)
        returnToApp()
        await settle()

        expect(store().cloudSessions.map((s) => s.id)).toEqual(['a'])
    })

    it('retries sessions that failed to upload when returning to the app', async () => {
        render(<SyncProvider />)
        await settle()
        mocks.pushSessionsToCloud.mockResolvedValueOnce([])
        act(() => store().addPendingSession(session('offline')))
        await settle(1000)
        expect(store().pendingSessions).toHaveLength(1)

        await settle(20000)
        returnToApp()
        await settle()

        expect(store().pendingSessions).toHaveLength(0)
    })

    it('does not lose a session uploaded while a download is in flight', async () => {
        let finishDownload: (sessions: FocusSession[]) => void = () => {}
        render(<SyncProvider />)
        await settle()
        await settle(20000)

        mocks.fetchCloudSessions.mockImplementationOnce(
            () => new Promise((resolve) => { finishDownload = resolve }),
        )
        returnToApp()
        await settle()
        act(() => store().addPendingSession(session('new')))
        await settle(1000)
        // The list from before the upload arrives only now.
        finishDownload([])
        await settle()

        expect(store().pendingSessions).toHaveLength(0)
        expect(store().cloudSessions.map((s) => s.id)).toEqual(['new'])
    })

    it('uploads the time studied immediately when the page closes', async () => {
        render(<SyncProvider />)
        await settle()
        act(() => store().updateSettings({ focusDuration: 30 }))
        act(() => store().start())
        await settle(15 * 60000)
        vi.mocked(fetch).mockClear()

        act(() => store().markPageClosed())

        expect(fetch).toHaveBeenCalledTimes(1)
        const [url, init] = vi.mocked(fetch).mock.calls[0]
        expect(url).toBe('https://example.supabase.co/rest/v1/focus_sessions?on_conflict=id')
        expect(init?.keepalive).toBe(true)
        expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer token-1')
        expect((init?.headers as Record<string, string>).Prefer).toContain('ignore-duplicates')
        const [row] = JSON.parse(init?.body as string)
        expect(row.user_id).toBe('user-1')
        expect(row.actual_duration_seconds).toBe(15 * 60)
    })

    it('uploads waiting sessions when the app goes to the background', async () => {
        render(<SyncProvider />)
        await settle()
        act(() => useTimerStore.setState({ pendingSessions: [session('waiting')] }))
        vi.mocked(fetch).mockClear()

        vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
        document.dispatchEvent(new Event('visibilitychange'))
        vi.restoreAllMocks()

        expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('keeps the request small enough for the browser to accept while closing', () => {
        const many = Array.from({ length: 500 }, (_, i) => session(`s${i}`))
        sendSessionsBeforeClose(many, 'user-1', 'token-1')

        const body = vi.mocked(fetch).mock.calls[0][1]?.body as string
        expect(body.length).toBeLessThan(64 * 1024)
    })
})

describe('settings between devices', () => {
    const changed = (focusDuration: number): AppSettings => ({ ...DEFAULT_SETTINGS, focusDuration })

    it('applies a change made on another device when returning to the app', async () => {
        render(<SyncProvider />)
        await settle()
        mocks.fetchCloudSettings.mockResolvedValue(changed(60))
        await settle(20000)
        returnToApp()
        await settle()

        expect(store().settings.focusDuration).toBe(60)
    })

    it('does not undo a local change still waiting to upload', async () => {
        render(<SyncProvider />)
        await settle(20000)
        mocks.fetchCloudSettings.mockResolvedValue(changed(60))
        mocks.pushSettingsToCloud.mockResolvedValue(false) // offline

        act(() => store().updateSettings({ focusDuration: 45 }))
        await settle(20000)
        returnToApp()
        await settle()

        expect(store().settings.focusDuration).toBe(45)
    })

    it('ignores cloud settings that only differ in key order', async () => {
        render(<SyncProvider />)
        await settle()
        const before = store().settings
        const reordered = Object.fromEntries(Object.entries(before).reverse()) as unknown as AppSettings
        mocks.fetchCloudSettings.mockResolvedValue(reordered)
        await settle(20000)
        returnToApp()
        await settle()

        expect(store().settings).toBe(before)
    })
})
