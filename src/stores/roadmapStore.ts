import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface RoadmapState {
    completed: Record<string, true> // roadmap item id -> done
    toggle: (id: string) => void
}

export const useRoadmapStore = create<RoadmapState>()(
    persist(
        (set, get) => ({
            completed: {},
            toggle: (id) => {
                const completed = { ...get().completed }
                if (completed[id]) delete completed[id]
                else completed[id] = true
                set({ completed })
            },
        }),
        {
            name: 'pomolock-roadmap',
            partialize: (state) => ({ completed: state.completed }),
        }
    )
)
