import { useSyncExternalStore } from 'react'

const subscribe = () => () => { }

/**
 * False during server rendering and hydration, true afterwards. Use it to
 * render values that only exist in the browser (localStorage, local time,
 * random choices) without a hydration mismatch.
 */
export function useIsClient(): boolean {
    return useSyncExternalStore(subscribe, () => true, () => false)
}
