'use client'

import { useEffect, useState } from 'react'
import { useIsClient } from '@/hooks/useIsClient'
import { useUser } from '@/hooks/useUser'
import { useTimerStore } from '@/stores/timerStore'
import { getLocalDateString } from '@/lib/utils'

// "{name}" marks where the name goes; it is rendered in the accent color.
const MORNING = ['Bom dia, {name}', 'Bora começar o dia, {name}?']
const AFTERNOON = ['Boa tarde, {name}', 'Bora estudar, {name}?']
const EVENING = ['Boa noite, {name}', 'Estudo da noite, {name}?']
const LATE_NIGHT = ['Madrugada de estudo, {name}?']
const ANYTIME = ['De volta aos estudos, {name}', 'Vamos matutar, {name}?', 'Pronto pra começar, {name}?']

// Per-device flag: the greeting opens the first visit of the day and is gone
// once the first timer of the day starts.
const STORAGE_KEY = 'pomolock-greeting-dismissed'

function readDismissedDate(): string | null {
    try {
        return localStorage.getItem(STORAGE_KEY)
    } catch {
        return null
    }
}

function writeDismissedDate(date: string) {
    try {
        localStorage.setItem(STORAGE_KEY, date)
    } catch {
        // Storage unavailable: the greeting may show again, which is harmless
    }
}

function pickPhrase(): string {
    const hour = new Date().getHours()
    const byTime = hour < 5 ? LATE_NIGHT : hour < 12 ? MORNING : hour < 18 ? AFTERNOON : EVENING
    const options = [...byTime, ...ANYTIME]
    return options[Math.floor(Math.random() * options.length)]
}

export function Greeting({ accentColor }: { accentColor: string }) {
    const { user } = useUser()
    const status = useTimerStore((s) => s.status)
    const displayName = useTimerStore((s) => s.settings.displayName)

    const googleFirstName = (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0]
    const name = displayName?.trim() || googleFirstName

    // Random choice, local time and localStorage only exist in the browser, so
    // nothing is shown until hydration is done.
    const isClient = useIsClient()
    const [phrase] = useState(pickPhrase)

    // Starting, pausing or entering hyperfocus ends the greeting for today.
    // The status change itself re-renders, and the flag keeps it hidden after.
    useEffect(() => {
        if (status !== 'idle') writeDismissedDate(getLocalDateString())
    }, [status])

    const visible =
        isClient && !!name && status === 'idle' && readDismissedDate() !== getLocalDateString()
    const [before, after] = phrase.split('{name}')

    // Collapses to zero height when hidden, so the page looks exactly as before.
    return (
        <div
            className="grid transition-all duration-500 ease-out"
            style={{ gridTemplateRows: visible ? '1fr' : '0fr', opacity: visible ? 1 : 0 }}
            aria-hidden={!visible}
        >
            <div className="overflow-hidden">
                <p className="pb-6 text-center font-serif text-[1.75rem] leading-tight text-zinc-100">
                    {before}
                    <span style={{ color: accentColor }}>{name}</span>
                    {after}
                </p>
            </div>
        </div>
    )
}
