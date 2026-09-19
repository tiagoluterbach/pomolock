// Timer Web Worker
// Wake the main thread while running. The persisted clock in the store
// measures elapsed time; callback frequency is not a source of truth.

let intervalId = null

self.onmessage = function (event) {
    const { type } = event.data

    switch (type) {
        case 'start':
            if (intervalId !== null) clearInterval(intervalId)
            intervalId = setInterval(function () {
                self.postMessage({ type: 'tick' })
            }, 1000)
            break

        case 'stop':
            if (intervalId !== null) {
                clearInterval(intervalId)
                intervalId = null
            }
            break

        default:
            break
    }
}
