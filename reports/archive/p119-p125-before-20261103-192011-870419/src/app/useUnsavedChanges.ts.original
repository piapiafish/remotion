import { useEffect } from 'react'
import { useProjectStore } from '../store/project'

export function useUnsavedChanges() {
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!useProjectStore.getState().hasUnsavedChanges()) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])
}
