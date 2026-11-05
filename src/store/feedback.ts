import { create } from 'zustand'

type Notice = { kind: 'error' | 'info'; message: string }
export const useFeedbackStore = create<{ notice: Notice | null; show: (notice: Notice) => void; dismiss: () => void }>((set) => ({
  notice: null,
  show: notice => set({ notice }),
  dismiss: () => set({ notice: null }),
}))

export function reportError(action: string, error: unknown) {
  const detail = error instanceof Error ? error.message : String(error)
  useFeedbackStore.getState().show({ kind: 'error', message: `${action}：${detail}` })
}
