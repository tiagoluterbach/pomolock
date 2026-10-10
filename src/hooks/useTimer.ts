import { useTimerStore, isGivingUpLocked } from '@/stores/timerStore'
import { formatClock, getLocalDateString } from '@/lib/utils'
import type { TimerMode } from '@/types'

const MODE_LABELS: Record<TimerMode, string> = {
    focus: 'Pomodoro',
    shortBreak: 'Short Break',
    longBreak: 'Long Break',
}

/** Timer state and actions, plus the derived values the timer screen displays. */
export function useTimer() {
    const {
        mode,
        status,
        secondsRemaining,
        hyperfocusSeconds,
        completedPomodoros,
        lastPomodoroDate,
        hyperfocusEnabled,
        settings,
        start,
        pause,
        reset,
        skip,
        toggleHyperfocus,
        setMode,
    } = useTimerStore()
    const givingUpLocked = useTimerStore(isGivingUpLocked)

    const dailyPomodoros = lastPomodoroDate === getLocalDateString() ? completedPomodoros : 0

    const isHyperfocusPaused =
        status === 'paused' && mode === 'focus' && secondsRemaining === 0 && hyperfocusEnabled
    const showHyperfocus = status === 'hyperfocus' || isHyperfocusPaused

    const modeLabel =
        status === 'hyperfocus' ? 'Hyperfocus'
            : isHyperfocusPaused ? 'Hyperfocus Paused'
                : MODE_LABELS[mode]

    return {
        mode,
        status,
        secondsRemaining,
        hyperfocusSeconds,
        completedPomodoros: dailyPomodoros,
        hyperfocusEnabled,
        settings,
        formattedTime: formatClock(showHyperfocus ? hyperfocusSeconds : secondsRemaining),
        accentColor: showHyperfocus ? settings.modeColors.hyperfocus : settings.modeColors[mode],
        modeLabel,
        givingUpLocked,
        start,
        pause,
        reset,
        skip,
        toggleHyperfocus,
        setMode,
    }
}
