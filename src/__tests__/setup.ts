import '@testing-library/jest-dom/vitest'

// Node 25+ ships its own `localStorage` global, which shadows jsdom's and is
// unusable without --localstorage-file. Swap in an in-memory Storage.
if (typeof globalThis.localStorage?.setItem !== 'function') {
    const store = new Map<string, string>()
    const memoryStorage: Storage = {
        get length() { return store.size },
        clear: () => store.clear(),
        getItem: (key) => store.get(key) ?? null,
        key: (index) => Array.from(store.keys())[index] ?? null,
        removeItem: (key) => { store.delete(key) },
        setItem: (key, value) => { store.set(key, String(value)) },
    }
    Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true })
}
